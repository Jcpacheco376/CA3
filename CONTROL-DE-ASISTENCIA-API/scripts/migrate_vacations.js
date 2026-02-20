const sql = require('mssql');
require('dotenv').config({ path: '../.env' }); // or the correct env path

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

const migrationQuery = `
-- 1. Estatus Asistencia
IF NOT EXISTS (SELECT 1 FROM CatalogoEstatusAsistencia WHERE Abreviatura = 'VAC')
BEGIN
    INSERT INTO CatalogoEstatusAsistencia (Abreviatura, Descripcion, ColorUI, ValorNomina, VisibleSupervisor, Activo, DiasRegistroFuturo, PermiteComentario, TipoCalculoId, CodRef)
    VALUES ('VAC', 'Vacaciones', 'bg-purple-100 text-purple-700', 1, 1, 1, 30, 1, 'DIA', 'VAC');
END

-- 2. Tablas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VacacionesSaldos]') AND type in (N'U'))
BEGIN
    CREATE TABLE VacacionesSaldos (
        SaldoId INT IDENTITY(1,1) PRIMARY KEY,
        EmpleadoId INT NOT NULL FOREIGN KEY REFERENCES Empleados(EmpleadoId),
        Anio INT NOT NULL,
        DiasOtorgados INT NOT NULL DEFAULT 0,
        DiasDisfrutados INT NOT NULL DEFAULT 0,
        DiasRestantes AS (DiasOtorgados - DiasDisfrutados)
    );
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SolicitudesVacaciones]') AND type in (N'U'))
BEGIN
    CREATE TABLE SolicitudesVacaciones (
        SolicitudId INT IDENTITY(1,1) PRIMARY KEY,
        EmpleadoId INT NOT NULL FOREIGN KEY REFERENCES Empleados(EmpleadoId),
        FechaInicio DATE NOT NULL,
        FechaFin DATE NOT NULL,
        DiasSolicitados INT NOT NULL,
        Comentarios NVARCHAR(MAX),
        Estatus VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, Aprobado, Rechazado
        UsuarioAutorizoId INT FOREIGN KEY REFERENCES Usuarios(UsuarioId),
        FechaSolicitud DATETIME DEFAULT GETDATE(),
        FechaRespuesta DATETIME
    );
END

-- 3. Stored Procedures
GO

CREATE OR ALTER PROCEDURE sp_Vacaciones_GenerarSaldosBase
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @AnioActual INT = YEAR(GETDATE());
    
    -- Lógica simple: Insertar registro de saldo para todos los empleados activos si no existe
    -- Se podría configurar la lógica de días según ley. Por ahora asignaremos 12 (Ley Federal del Trabajo en Mexico inicial).
    INSERT INTO VacacionesSaldos (EmpleadoId, Anio, DiasOtorgados, DiasDisfrutados)
    SELECT E.EmpleadoId, @AnioActual, 
        CASE 
            WHEN DATEDIFF(YEAR, E.FechaIngreso, GETDATE()) >= 1 
            THEN 12 + (DATEDIFF(YEAR, E.FechaIngreso, GETDATE()) - 1) * 2 -- Lógica básica LFT (simplificada)
            ELSE 12 
        END,
        0
    FROM Empleados E
    WHERE E.Activo = 1 
      AND NOT EXISTS (
          SELECT 1 FROM VacacionesSaldos VS 
          WHERE VS.EmpleadoId = E.EmpleadoId AND VS.Anio = @AnioActual
      );
END
GO

CREATE OR ALTER PROCEDURE sp_Vacaciones_CrearSolicitud
    @EmpleadoId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @DiasSolicitados INT,
    @Comentarios NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AnioActual INT = YEAR(GETDATE());
    DECLARE @DiasRestantes INT;

    -- Verificar saldo
    SELECT @DiasRestantes = DiasRestantes 
    FROM VacacionesSaldos 
    WHERE EmpleadoId = @EmpleadoId AND Anio = @AnioActual;

    IF @DiasRestantes IS NULL OR @DiasRestantes < @DiasSolicitados
    BEGIN
        RAISERROR('El empleado no tiene suficientes días de vacaciones.', 16, 1);
        RETURN;
    END

    -- Insertar solicitud
    INSERT INTO SolicitudesVacaciones (EmpleadoId, FechaInicio, FechaFin, DiasSolicitados, Comentarios, Estatus, FechaSolicitud)
    VALUES (@EmpleadoId, @FechaInicio, @FechaFin, @DiasSolicitados, @Comentarios, 'Pendiente', GETDATE());
    
    SELECT SCOPE_IDENTITY() as SolicitudId;
END
GO

CREATE OR ALTER PROCEDURE sp_Vacaciones_ResponderSolicitud
    @SolicitudId INT,
    @Estatus VARCHAR(20), -- 'Aprobado' o 'Rechazado'
    @UsuarioAutorizoId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @EmpleadoId INT;
    DECLARE @FechaInicio DATE;
    DECLARE @FechaFin DATE;
    DECLARE @DiasSolicitados INT;
    DECLARE @EstatusActual VARCHAR(20);
    DECLARE @AnioActual INT;
    DECLARE @EstatusVacId INT;
    
    -- 1. Obtener ID del Estatus Manual 'VAC'
    SELECT @EstatusVacId = EstatusId FROM CatalogoEstatusAsistencia WHERE Abreviatura = 'VAC';

    -- 2. Validar solicitud
    SELECT 
        @EmpleadoId = EmpleadoId,
        @FechaInicio = FechaInicio,
        @FechaFin = FechaFin,
        @DiasSolicitados = DiasSolicitados,
        @EstatusActual = Estatus
    FROM SolicitudesVacaciones
    WHERE SolicitudId = @SolicitudId;
    
    IF @EstatusActual <> 'Pendiente'
    BEGIN
        RAISERROR('La solicitud ya ha sido respondida.', 16, 1);
        RETURN;
    END

    -- 3. Actualizar Solicitud
    UPDATE SolicitudesVacaciones
    SET 
        Estatus = @Estatus,
        UsuarioAutorizoId = @UsuarioAutorizoId,
        FechaRespuesta = GETDATE()
    WHERE SolicitudId = @SolicitudId;
    
    SET @AnioActual = YEAR(@FechaInicio);

    -- 4. Si es APROBADO, descontar saldo y actualizar fichas
    IF @Estatus = 'Aprobado'
    BEGIN
        -- Descontar saldo
        UPDATE VacacionesSaldos
        SET DiasDisfrutados = DiasDisfrutados + @DiasSolicitados
        WHERE EmpleadoId = @EmpleadoId AND Anio = @AnioActual;
        
        -- Insertar / Actualizar Fichas de Asistencia (Iterar fechas)
        DECLARE @CurrentDate DATE = @FechaInicio;
        
        WHILE @CurrentDate <= @FechaFin
        BEGIN
            -- Aquí ignoraremos días de descanso (idealmente se calcula basándose en el horario del empleado)
            -- Pero como simplificación, insertamos / actualizamos la ficha directamente indicando la vacación.
            IF EXISTS (SELECT 1 FROM FichaAsistencia WHERE EmpleadoId = @EmpleadoId AND Fecha = @CurrentDate)
            BEGIN
                UPDATE FichaAsistencia
                SET EstatusManualId = @EstatusVacId,
                    Estado = 'VALIDADO',
                    Comentarios = ISNULL(Comentarios, '') + ' (Vacaciones Aprobadas)',
                    FechaModificacion = GETDATE(),
                    ModificadoPorUsuarioId = @UsuarioAutorizoId
                WHERE EmpleadoId = @EmpleadoId AND Fecha = @CurrentDate;
            END
            ELSE
            BEGIN
                -- Invertemos basico si no existe ficha ese dia:
                DECLARE @HorarioId INT;
                SELECT @HorarioId = HorarioIdPredeterminado FROM Empleados WHERE EmpleadoId = @EmpleadoId;
                
                INSERT INTO FichaAsistencia (EmpleadoId, Fecha, HorarioId, EstatusManualId, Estado, ModificadoPorUsuarioId, FechaModificacion, Comentarios)
                VALUES (@EmpleadoId, @CurrentDate, @HorarioId, @EstatusVacId, 'VALIDADO', @UsuarioAutorizoId, GETDATE(), 'Vacaciones Aprobadas');
            END
            
            SET @CurrentDate = DATEADD(day, 1, @CurrentDate);
        END
    END
END
GO
`;

async function runMigration() {
    try {
        const pool = await sql.connect(dbConfig);

        // MSSQL Driver cannot run multiple GO batches easily internally using request().query() directly with GO tokens.
        // We will split the string by GO and run them sequentially.
        const batches = migrationQuery.split(/\bGO\b/i);
        for (let batch of batches) {
            const trimmed = batch.trim();
            if (trimmed.length > 0) {
                await pool.request().batch(trimmed);
            }
        }
        console.log("Migration executed successfully!");
        await sql.close();
    } catch (err) {
        console.error("Migration Failed:", err);
    }
}
runMigration();
