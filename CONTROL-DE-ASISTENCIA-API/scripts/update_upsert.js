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

async function fix() {
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request().query(`
            ALTER PROCEDURE [dbo].[sp_Usuarios_Upsert]
                @UsuarioId INT,
                @NombreCompleto NVARCHAR(100),
                @NombreUsuario NVARCHAR(50),
                @Email NVARCHAR(100),
                @Password NVARCHAR(100),
                @EstaActivo BIT,
                @RolesJSON NVARCHAR(MAX),
                @DepartamentosJSON NVARCHAR(MAX),
                @GruposNominaJSON NVARCHAR(MAX),
                @PuestosJSON NVARCHAR(MAX),
                @EstablecimientosJSON NVARCHAR(MAX),
                @EmpleadoId INT = NULL
            AS
            BEGIN
                SET NOCOUNT ON;

                -- 1. Validaciones de Usuario Único
                IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE NombreUsuario = @NombreUsuario AND UsuarioId != @UsuarioId)
                BEGIN
                    RAISERROR ('El nombre de usuario ''%s'' ya está en uso.', 16, 1, @NombreUsuario);
                    RETURN;
                END

                -- 2. Upsert en Tabla Usuarios
                IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE UsuarioId = @UsuarioId)
                BEGIN
                    UPDATE dbo.Usuarios
                    SET NombreCompleto = @NombreCompleto, Email = @Email, EstaActivo = @EstaActivo, NombreUsuario = @NombreUsuario, EmpleadoId = @EmpleadoId
                    WHERE UsuarioId = @UsuarioId;

                    IF @Password IS NOT NULL AND @Password != ''
                    BEGIN
                        UPDATE dbo.Usuarios SET PasswordHash = PWDENCRYPT(@Password), DebeCambiarPassword = 1 WHERE UsuarioId = @UsuarioId;
                    END
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.Usuarios (UsuarioId, NombreUsuario, PasswordHash, NombreCompleto, Email, EstaActivo, EmpleadoId)
                    VALUES (@UsuarioId, @NombreUsuario, PWDENCRYPT(@Password), @NombreCompleto, @Email, @EstaActivo, @EmpleadoId);
                END

                -- 3. Actualización de Relaciones
                DELETE FROM dbo.UsuariosRoles WHERE UsuarioId = @UsuarioId;

                INSERT INTO dbo.UsuariosRoles (UsuarioId, RoleId, EsPrincipal)
                SELECT 
                    @UsuarioId, 
                    RoleId, 
                    ISNULL(EsPrincipal, 0) 
                FROM OPENJSON(@RolesJSON) 
                WITH (
                    RoleId INT '$.RoleId',
                    EsPrincipal BIT '$.EsPrincipal'
                );

                DELETE FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId;
                INSERT INTO dbo.UsuariosDepartamentos (UsuarioId, DepartamentoId) SELECT @UsuarioId, DepartamentoId FROM OPENJSON(@DepartamentosJSON) WITH (DepartamentoId INT '$.DepartamentoId');

                DELETE FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId;
                INSERT INTO dbo.UsuariosGruposNomina (UsuarioId, GrupoNominaId) SELECT @UsuarioId, GrupoNominaId FROM OPENJSON(@GruposNominaJSON) WITH (GrupoNominaId INT '$.GrupoNominaId');

                DELETE FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId;
                INSERT INTO dbo.UsuariosPuestos (UsuarioId, PuestoId) SELECT @UsuarioId, PuestoId FROM OPENJSON(@PuestosJSON) WITH (PuestoId INT '$.PuestoId');

                DELETE FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId;
                INSERT INTO dbo.UsuariosEstablecimientos (UsuarioId, EstablecimientoId) SELECT @UsuarioId, EstablecimientoId FROM OPENJSON(@EstablecimientosJSON) WITH (EstablecimientoId INT '$.EstablecimientoId');

                SELECT UsuarioId, NombreCompleto FROM dbo.Usuarios WHERE UsuarioId = @UsuarioId;
            END
        `);
        console.log("Fixed sp_Usuarios_Upsert to accept EmpleadoId");
        await sql.close();
    } catch (err) {
        console.error('Error: ', err);
    }
}

fix();
