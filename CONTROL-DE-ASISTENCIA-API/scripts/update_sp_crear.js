const sql = require('mssql');
require('dotenv').config({ path: '../.env' }); // Adjust if needed

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function updateSP() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected to DB');

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE sp_Vacaciones_CrearSolicitud
                @EmpleadoId INT,
                @FechaInicio DATE,
                @FechaFin DATE,
                @DiasSolicitados INT,
                @Comentarios NVARCHAR(MAX),
                @UsuarioSolicitanteId INT
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @DiasRestantes DECIMAL(10,2);

                -- Sumar todos los dias otorgados y restarle los dias disfrutados para saber el total real disponible
                SELECT @DiasRestantes = SUM(ISNULL(DiasOtorgados, 0) - ISNULL(DiasDisfrutados, 0))
                FROM VacacionesSaldos
                WHERE EmpleadoId = @EmpleadoId;

                IF @DiasRestantes IS NULL OR @DiasRestantes < @DiasSolicitados
                BEGIN
                    DECLARE @ErrMsg VARCHAR(255) = 'El empleado no tiene suficientes días de vacaciones (Total disponible: ' + ISNULL(CAST(@DiasRestantes AS VARCHAR(20)), '0') + ', Solicitados: ' + CAST(@DiasSolicitados AS VARCHAR(20)) + ').';
                    RAISERROR(@ErrMsg, 16, 1);
                    RETURN;
                END

                -- Insertar solicitud principal
                DECLARE @NuevoSolicitudId INT;

                INSERT INTO SolicitudesVacaciones (
                    EmpleadoId, FechaInicio, FechaFin, DiasSolicitados, 
                    Comentarios, Estatus, FechaSolicitud, UsuarioSolicitanteId
                )
                VALUES (
                    @EmpleadoId, @FechaInicio, @FechaFin, @DiasSolicitados, 
                    @Comentarios, 'Pendiente', GETDATE(), @UsuarioSolicitanteId
                );

                SET @NuevoSolicitudId = SCOPE_IDENTITY();

                DECLARE @UsuarioSolicitanteEmpleadoId INT;
                SELECT @UsuarioSolicitanteEmpleadoId = EmpleadoId FROM Usuarios WHERE UsuarioId = @UsuarioSolicitanteId;

                -- Insertar firmas pendientes basadas en la configuración
                INSERT INTO SolicitudesVacacionesFirmas (
                    SolicitudId, ConfigId, EstatusFirma, UsuarioFirmaId, FechaFirma
                )
                SELECT 
                    @NuevoSolicitudId,
                    c.ConfigId,
                    -- Logica de Autofirma: Solo si lo crea para OTRO empleado y el solicitante tiene el rol especifico de la etapa
                    CASE WHEN ISNULL(@UsuarioSolicitanteEmpleadoId, -1) <> @EmpleadoId 
                              AND EXISTS (SELECT 1 FROM UsuariosRoles ur WHERE ur.UsuarioId = @UsuarioSolicitanteId AND ur.RoleId = c.RoleId)
                         THEN 'Aprobado' ELSE 'Pendiente' END,
                    CASE WHEN ISNULL(@UsuarioSolicitanteEmpleadoId, -1) <> @EmpleadoId 
                              AND EXISTS (SELECT 1 FROM UsuariosRoles ur WHERE ur.UsuarioId = @UsuarioSolicitanteId AND ur.RoleId = c.RoleId)
                         THEN @UsuarioSolicitanteId ELSE NULL END,
                    CASE WHEN ISNULL(@UsuarioSolicitanteEmpleadoId, -1) <> @EmpleadoId 
                              AND EXISTS (SELECT 1 FROM UsuariosRoles ur WHERE ur.UsuarioId = @UsuarioSolicitanteId AND ur.RoleId = c.RoleId)
                         THEN GETDATE() ELSE NULL END
                FROM VacacionesAprobadoresConfig c
                WHERE c.EsObligatorio = 1;

                -- Verificar si de causalidad todas las firmas ya se autoaprobaron (e.g. un Gerente/RH que tiene un rol supremo y se quitan firmas o algo asi)
                -- Esto se resolvera en sp_Vacaciones_ResponderSolicitud en el futuro, pero lo checamos por si acaso
                DECLARE @TotalFirmas INT;
                DECLARE @FirmasAprobadas INT;

                SELECT @TotalFirmas = COUNT(*) FROM SolicitudesVacacionesFirmas WHERE SolicitudId = @NuevoSolicitudId;
                SELECT @FirmasAprobadas = COUNT(*) FROM SolicitudesVacacionesFirmas WHERE SolicitudId = @NuevoSolicitudId AND EstatusFirma = 'Aprobado';

                IF @TotalFirmas = @FirmasAprobadas AND @TotalFirmas > 0
                BEGIN
                    UPDATE SolicitudesVacaciones SET Estatus = 'Aprobado' WHERE SolicitudId = @NuevoSolicitudId;
                    
                    -- Aqui deberiamos insertar en asistencia, pero lo podemos delegar o reusar la logica de ResponderSolicitud
                END

                SELECT @NuevoSolicitudId as SolicitudId;
            END
        `);
        console.log('SP sp_Vacaciones_CrearSolicitud actualizado');

        await sql.close();
    } catch (err) {
        console.error('Error: ', err);
    }
}

updateSP();
