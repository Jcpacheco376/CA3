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

async function getSP() {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("EXEC sp_helptext 'sp_Vacaciones_CrearSolicitud'");

        console.log(result.recordset.map(r => r.Text).join(''));

        await sql.close();
    } catch (err) {
        console.error('Error: ', err);
    }
}

getSP();
