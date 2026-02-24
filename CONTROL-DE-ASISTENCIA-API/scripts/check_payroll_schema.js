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

async function checkSchema() {
    try {
        const pool = await sql.connect(dbConfig);

        const tables = [
            'CatalogoConceptosNomina',
            'CatalogoEstatusAsistencia',
            'SistemaTiposCalculo',
            'Prenomina',
            'PrenominaDetalle'
        ];

        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const result = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = '${table}'
            `);
            console.table(result.recordset);
        }

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
checkSchema();
