const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

async function checkDb() {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Roles_GetAll');

        console.log('--- RAW ROLES OUTPUT ---');
        result.recordset.forEach(r => {
            console.log(`Role: ${r.NombreRol} (ID: ${r.RoleId})`);
            console.log(`  SISPermisos Type: ${typeof r.SISPermisos}`);
            console.log(`  SISPermisos (First 100 chars): ${String(r.SISPermisos).substring(0, 100)}`);
        });

        const inactivePerms = await pool.request().query('SELECT COUNT(*) as count FROM SISPermisos WHERE Activo = 0');
        console.log('Inactive SISPermisos:', inactivePerms.recordset[0].count);

        const firstActive = await pool.request().query('SELECT TOP 5 * FROM SISPermisos');
        console.log('SISPermisos Sample:', firstActive.recordset);

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
checkDb();
