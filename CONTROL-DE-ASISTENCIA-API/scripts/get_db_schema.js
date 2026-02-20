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

async function getDbSchema() {
    try {
        const pool = await sql.connect(dbConfig);
        const tablesResult = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'");
        const tables = tablesResult.recordset.map(r => r.TABLE_NAME);

        for (const table of tables) {
            console.log(`\n--- TABLE: ${table} ---`);
            const colsResult = await pool.request().query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='${table}'`);
            colsResult.recordset.forEach(c => {
                console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
            });
        }
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
getDbSchema();
