// diagnose_sps.js — Read actual SP definitions from the running DB
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

(async () => {
    const pool = await sql.connect(cfg);

    // 1. Get SP definitions for the critical ones
    const spNames = ['sp_Usuarios_GetAll', 'sp_Usuario_ObtenerPermisos', 'sp_Usuarios_Login', 'sp_Auth_Login'];
    for (const sp of spNames) {
        const res = await pool.request().query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID('dbo.${sp}')) AS definition
        `);
        const def = res.recordset[0]?.definition;
        if (def) {
            console.log(`\n===== ${sp} =====`);
            console.log(def);
        } else {
            console.log(`\n${sp}: NOT FOUND or no definition`);
        }
    }

    // 2. Direct test: get roles for all users
    const roles = await pool.request().query(`
        SELECT u.UsuarioId, u.NombreCompleto,
               r.RoleId, r.NombreRol, ur.EsPrincipal
        FROM dbo.Usuarios u
        LEFT JOIN dbo.UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId
        LEFT JOIN dbo.Roles r ON ur.RoleId = r.RoleId
        ORDER BY u.UsuarioId
    `);
    console.log('\n===== UsuariosRoles direct query =====');
    roles.recordset.forEach(r => console.log(`  ${r.UsuarioId} - ${r.NombreCompleto}: ${r.NombreRol || 'NO ROLE'} EsPrincipal=${r.EsPrincipal}`));

    // 3. Test sp_Usuarios_GetAll and see what it returns for Roles column
    const allUsers = await pool.request().execute('sp_Usuarios_GetAll');
    console.log('\n===== sp_Usuarios_GetAll Roles column output =====');
    allUsers.recordset.forEach(u => console.log(`  ${u.UsuarioId} - ${u.NombreCompleto}: Roles=${u.Roles}`));

    await pool.close();
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
