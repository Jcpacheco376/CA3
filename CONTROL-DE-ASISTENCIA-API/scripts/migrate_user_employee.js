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

async function migrate() {
    try {
        const pool = await sql.connect(dbConfig);

        console.log("Adding EmpleadoId to Usuarios...");
        await pool.request().query(`
            IF COL_LENGTH('dbo.Usuarios', 'EmpleadoId') IS NULL
            BEGIN
                ALTER TABLE dbo.Usuarios ADD EmpleadoId INT NULL;
                ALTER TABLE dbo.Usuarios ADD CONSTRAINT FK_Usuarios_Empleados FOREIGN KEY (EmpleadoId) REFERENCES dbo.Empleados(EmpleadoId);
            END
        `);

        console.log("Updating sp_Usuarios_GetAll...");
        await pool.request().query(`
            IF OBJECT_ID('dbo.sp_Usuarios_GetAll', 'P') IS NOT NULL
            BEGIN
                EXEC('
                ALTER PROCEDURE [dbo].[sp_Usuarios_GetAll]
                AS
                BEGIN
                    SET NOCOUNT ON;
                    
                    SELECT 
                        u.UsuarioId,
                        u.NombreUsuario,
                        u.NombreCompleto,
                        u.Email,
                        u.EstaActivo,
                        u.FechaCreacion,
                        u.Theme,
                        u.AnimationsEnabled,
                        u.DebeCambiarPassword,
                        u.EmpleadoId,
                        roles = (
                            SELECT r.NombreRol, r.RoleId, ur.EsPrincipal
                            FROM dbo.UsuariosRoles ur
                            INNER JOIN dbo.Roles r ON ur.RoleId = r.RoleId
                            WHERE ur.UsuarioId = u.UsuarioId
                            FOR JSON PATH
                        ),
                        Departamentos = (
                            SELECT d.DepartamentoId, d.NombreDepartamento
                            FROM dbo.UsuariosDepartamentos ud
                            INNER JOIN dbo.Departamentos d ON ud.DepartamentoId = d.DepartamentoId
                            WHERE ud.UsuarioId = u.UsuarioId
                            FOR JSON PATH
                        ),
                        GruposNomina = (
                            SELECT gn.GrupoNominaId, gn.NombreGrupo
                            FROM dbo.UsuariosGruposNomina ugn
                            INNER JOIN dbo.GruposNomina gn ON ugn.GrupoNominaId = gn.GrupoNominaId
                            WHERE ugn.UsuarioId = u.UsuarioId
                            FOR JSON PATH
                        ),
                        Puestos = (
                            SELECT p.PuestoId, p.NombrePuesto
                            FROM dbo.UsuariosPuestos up
                            INNER JOIN dbo.Puestos p ON up.PuestoId = p.PuestoId
                            WHERE up.UsuarioId = u.UsuarioId
                            FOR JSON PATH
                        ),
                        Establecimientos = (
                            SELECT e.EstablecimientoId, e.NombreEstablecimiento
                            FROM dbo.UsuariosEstablecimientos ue
                            INNER JOIN dbo.Establecimientos e ON ue.EstablecimientoId = e.EstablecimientoId
                            WHERE ue.UsuarioId = u.UsuarioId
                            FOR JSON PATH
                        )
                    FROM dbo.Usuarios u;
                END
                ')
            END
        `);

        console.log("Updating sp_Usuario_ValidarLogin...");
        await pool.request().query(`
            IF OBJECT_ID('dbo.sp_Usuario_ValidarLogin', 'P') IS NOT NULL
            BEGIN
                EXEC('
                ALTER PROCEDURE [dbo].[sp_Usuario_ValidarLogin]
                    @Identificador NVARCHAR(255),
                    @Password NVARCHAR(255)
                AS
                BEGIN
                    SET NOCOUNT ON;
                    
                    DECLARE @UsuarioId INT;
                    DECLARE @PasswordHashCorrecto VARBINARY(256);
                    
                    SELECT TOP 1
                        @UsuarioId = UsuarioId,
                        @PasswordHashCorrecto = PasswordHash
                    FROM dbo.Usuarios
                    WHERE (NombreUsuario = @Identificador OR CAST(UsuarioId AS NVARCHAR(50)) = @Identificador) 
                      AND EstaActivo = 1;
                      
                    IF @UsuarioId IS NOT NULL AND PWDCOMPARE(@Password, @PasswordHashCorrecto) = 1
                    BEGIN
                        SELECT 
                            UsuarioId, NombreUsuario, NombreCompleto, Email, 
                            EstaActivo, FechaCreacion, Theme, AnimationsEnabled, 
                            DebeCambiarPassword, TokenVersion, EmpleadoId
                        FROM dbo.Usuarios
                        WHERE UsuarioId = @UsuarioId;
                    END
                END
                ')
            END
        `);

        console.log("Migration successful.");
        await sql.close();
    } catch (err) {
        console.error('Error: ', err);
    }
}

migrate();
