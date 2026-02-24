// fix_sp_getall_roles.js — Fix sp_Usuarios_GetAll: change 'roles' alias to 'Roles' (uppercase)
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

const dropSp = `IF OBJECT_ID('dbo.sp_Usuarios_GetAll') IS NOT NULL DROP PROCEDURE dbo.sp_Usuarios_GetAll;`;

const createSp = `
CREATE PROCEDURE [dbo].[sp_Usuarios_GetAll]
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

        -- CRITICAL: alias must be 'Roles' (capital R) to match Node.js controller
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
`;

(async () => {
    const pool = await sql.connect(cfg);
    await pool.request().query(dropSp);
    await pool.request().query(createSp);
    console.log('sp_Usuarios_GetAll fixed: Roles alias is now uppercase.');

    // Verify fix
    const test = await pool.request().execute('sp_Usuarios_GetAll');
    console.log('\n=== VERIFICATION — Roles column after fix ===');
    test.recordset.forEach(u => {
        const rolesRaw = u.Roles;
        let parsed = [];
        try { parsed = rolesRaw ? JSON.parse(rolesRaw) : []; } catch { }
        const names = parsed.map(r => `${r.NombreRol}(${r.EsPrincipal ? 'P' : 'S'})`).join(', ') || 'SIN ROL';
        console.log(`  ${u.UsuarioId} - ${u.NombreCompleto}: ${names}`);
    });

    await pool.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
