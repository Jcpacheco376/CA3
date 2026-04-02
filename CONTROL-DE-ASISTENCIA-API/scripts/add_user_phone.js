const sql = require('mssql');
require('dotenv').config({ path: '../.env' });

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

async function run() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log("Connected to DB...");

        // 1. Add Telefono column if it doesn't exist
        console.log("Adding Telefono column to dbo.Usuarios...");
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'Telefono')
            BEGIN
                ALTER TABLE dbo.Usuarios ADD Telefono NVARCHAR(50);
            END
        `);

        // 2. Update sp_Usuarios_Upsert
        console.log("Updating sp_Usuarios_Upsert...");
        await pool.request().query(`
            ALTER PROCEDURE [dbo].[sp_Usuarios_Upsert]
                @UsuarioId INT,
                @NombreCompleto NVARCHAR(100),
                @NombreUsuario NVARCHAR(50),
                @Email NVARCHAR(100),
                @Telefono NVARCHAR(50) = NULL,
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
                    SET NombreCompleto = @NombreCompleto, 
                        Email = @Email, 
                        Telefono = @Telefono,
                        EstaActivo = @EstaActivo, 
                        NombreUsuario = @NombreUsuario, 
                        EmpleadoId = @EmpleadoId
                    WHERE UsuarioId = @UsuarioId;

                    IF @Password IS NOT NULL AND @Password != ''
                    BEGIN
                        UPDATE dbo.Usuarios SET PasswordHash = PWDENCRYPT(@Password), DebeCambiarPassword = 1 WHERE UsuarioId = @UsuarioId;
                    END
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.Usuarios (UsuarioId, NombreUsuario, PasswordHash, NombreCompleto, Email, Telefono, EstaActivo, EmpleadoId)
                    VALUES (@UsuarioId, @NombreUsuario, PWDENCRYPT(@Password), @NombreCompleto, @Email, @Telefono, @EstaActivo, @EmpleadoId);
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

        // 3. Update sp_Usuarios_GetAll
        console.log("Updating sp_Usuarios_GetAll...");
        await pool.request().query(`
            ALTER PROCEDURE [dbo].[sp_Usuarios_GetAll]
            AS
            BEGIN
                SET NOCOUNT ON;

                SELECT
                    u.UsuarioId,
                    u.NombreUsuario,
                    u.NombreCompleto,
                    u.Email,
                    u.Telefono,
                    u.EstaActivo,
                    u.FechaCreacion,
                    u.Theme,
                    u.AnimationsEnabled,
                    u.DebeCambiarPassword,
                    u.EmpleadoId,

                    Roles = (
                        SELECT r.RoleId, r.NombreRol, ur.EsPrincipal
                        FROM dbo.UsuariosRoles ur
                        INNER JOIN dbo.Roles r ON ur.RoleId = r.RoleId
                        WHERE ur.UsuarioId = u.UsuarioId
                        ORDER BY ur.EsPrincipal DESC, r.NombreRol ASC
                        FOR JSON PATH
                    ),

                    Departamentos = (
                        SELECT d.DepartamentoId, d.Nombre
                        FROM dbo.UsuariosDepartamentos ud
                        INNER JOIN dbo.CatalogoDepartamentos d ON ud.DepartamentoId = d.DepartamentoId
                        WHERE ud.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),

                    GruposNomina = (
                        SELECT gn.GrupoNominaId, gn.Nombre, gn.Periodo
                        FROM dbo.UsuariosGruposNomina ugn
                        INNER JOIN dbo.CatalogoGruposNomina gn ON ugn.GrupoNominaId = gn.GrupoNominaId
                        WHERE ugn.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),

                    Puestos = (
                        SELECT p.PuestoId, p.Nombre
                        FROM dbo.UsuariosPuestos up
                        INNER JOIN dbo.CatalogoPuestos p ON up.PuestoId = p.PuestoId
                        WHERE up.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),

                    Establecimientos = (
                        SELECT e.EstablecimientoId, e.Nombre
                        FROM dbo.UsuariosEstablecimientos ue
                        INNER JOIN dbo.CatalogoEstablecimientos e ON ue.EstablecimientoId = e.EstablecimientoId
                        WHERE ue.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    )

                FROM dbo.Usuarios u;
            END
        `);

        console.log("Database updated successfully.");
        await pool.close();
    } catch (err) {
        console.error('Error: ', err);
    }
}

run();
