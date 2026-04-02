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
        console.log('Connected');
        await pool.request().query("ALTER TABLE VacacionesAprobadoresConfig ADD RoleId INT;");
        await pool.request().query("UPDATE VacacionesAprobadoresConfig SET RoleId = 2 WHERE ConfigId = 1;");
        await pool.request().query("UPDATE VacacionesAprobadoresConfig SET RoleId = 3 WHERE ConfigId = 2;");
        await pool.request().query("UPDATE VacacionesAprobadoresConfig SET RoleId = 1 WHERE ConfigId = 3;");
        await pool.request().query("ALTER TABLE VacacionesAprobadoresConfig DROP COLUMN RolAprobador;");
        console.log('Done');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
migrate();
