// fix_upsert_empleadoid.js — Adds @EmpleadoId param to sp_Usuarios_Upsert
require('dotenv').config({ path: '../.env' });
const sql = require('mssql');

const cfg = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_DATABASE,
    options: { encrypt: false, trustServerCertificate: true }
};

const spSql = `
IF OBJECT_ID('dbo.sp_Usuarios_Upsert') IS NOT NULL DROP PROCEDURE dbo.sp_Usuarios_Upsert;
`;

const spCreate = `
CREATE PROCEDURE [dbo].[sp_Usuarios_Upsert]
    @UsuarioId INT,
    @NombreCompleto NVARCHAR(100),
    @NombreUsuario NVARCHAR(50),
    @Email NVARCHAR(100),
    @Password NVARCHAR(100),
    @EstaActivo BIT,
    @EmpleadoId INT = NULL,
    @RolesJSON NVARCHAR(MAX),
    @DepartamentosJSON NVARCHAR(MAX),
    @GruposNominaJSON NVARCHAR(MAX),
    @PuestosJSON NVARCHAR(MAX),
    @EstablecimientosJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE NombreUsuario = @NombreUsuario AND UsuarioId != @UsuarioId)
    BEGIN
        RAISERROR ('El nombre de usuario ya esta en uso.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.Usuarios WHERE UsuarioId = @UsuarioId)
    BEGIN
        UPDATE dbo.Usuarios
        SET NombreCompleto = @NombreCompleto,
            Email          = @Email,
            EstaActivo     = @EstaActivo,
            NombreUsuario  = @NombreUsuario,
            EmpleadoId     = @EmpleadoId
        WHERE UsuarioId = @UsuarioId;

        IF @Password IS NOT NULL AND @Password != ''
            UPDATE dbo.Usuarios SET PasswordHash = PWDENCRYPT(@Password), DebeCambiarPassword = 1 WHERE UsuarioId = @UsuarioId;
    END
    ELSE
    BEGIN
        INSERT INTO dbo.Usuarios (UsuarioId, NombreUsuario, PasswordHash, NombreCompleto, Email, EstaActivo, EmpleadoId)
        VALUES (@UsuarioId, @NombreUsuario, PWDENCRYPT(@Password), @NombreCompleto, @Email, @EstaActivo, @EmpleadoId);
    END

    -- Roles: el indice 0 siempre es el Principal (EsPrincipal=1)
    DELETE FROM dbo.UsuariosRoles WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosRoles (UsuarioId, RoleId, EsPrincipal)
    SELECT @UsuarioId, RoleId, ISNULL(EsPrincipal, 0)
    FROM OPENJSON(@RolesJSON)
    WITH (RoleId INT '$.RoleId', EsPrincipal BIT '$.EsPrincipal');

    DELETE FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosDepartamentos (UsuarioId, DepartamentoId)
        SELECT @UsuarioId, DepartamentoId FROM OPENJSON(@DepartamentosJSON) WITH (DepartamentoId INT '$.DepartamentoId');

    DELETE FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosGruposNomina (UsuarioId, GrupoNominaId)
        SELECT @UsuarioId, GrupoNominaId FROM OPENJSON(@GruposNominaJSON) WITH (GrupoNominaId INT '$.GrupoNominaId');

    DELETE FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosPuestos (UsuarioId, PuestoId)
        SELECT @UsuarioId, PuestoId FROM OPENJSON(@PuestosJSON) WITH (PuestoId INT '$.PuestoId');

    DELETE FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosEstablecimientos (UsuarioId, EstablecimientoId)
        SELECT @UsuarioId, EstablecimientoId FROM OPENJSON(@EstablecimientosJSON) WITH (EstablecimientoId INT '$.EstablecimientoId');

    SELECT UsuarioId, NombreCompleto FROM dbo.Usuarios WHERE UsuarioId = @UsuarioId;
END
`;

// Also show current roles state for diagnosis
const diagSql = `
SELECT u.UsuarioId, u.NombreCompleto, u.NombreUsuario,
       r.NombreRol, ur.EsPrincipal
FROM dbo.Usuarios u
LEFT JOIN dbo.UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId
LEFT JOIN dbo.Roles r ON ur.RoleId = r.RoleId
ORDER BY u.UsuarioId, ur.EsPrincipal DESC;
`;

(async () => {
    const pool = await sql.connect(cfg);
    // Drop + recreate SP
    await pool.request().query(spSql);
    await pool.request().query(spCreate);
    console.log('sp_Usuarios_Upsert recreated with @EmpleadoId support');

    // Show current roles in DB
    const diag = await pool.request().query(diagSql);
    console.log('\n=== CURRENT USER ROLES IN DB ===');
    diag.recordset.forEach(r => {
        const rol = r.NombreRol ? `${r.NombreRol} (Principal=${r.EsPrincipal})` : '(SIN ROL)';
        console.log(`  Usuario ${r.UsuarioId} - ${r.NombreCompleto}: ${rol}`);
    });

    await pool.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
