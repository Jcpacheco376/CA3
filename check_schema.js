const sql = require('mssql');
require('dotenv').config({ path: 'C:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/CONTROL-DE-ASISTENCIA-API/.env' });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function check() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected to DB');

        console.log('\n--- Column Details for CatalogoEstatusAsistencia ---');
        const columnsEstatus = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CatalogoEstatusAsistencia' AND COLUMN_NAME = 'TipoCalculoId'");
        console.log('CatalogoEstatusAsistencia:', columnsEstatus.recordset);

        console.log('\n--- Column Details for SISTiposCalculo ---');
        const columnsSIS = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SISTiposCalculo' AND COLUMN_NAME = 'TipoCalculoId'");
        console.log('SISTiposCalculo:', columnsSIS.recordset);

        console.log('\n--- Checking for spaces or weird chars in SISTiposCalculo ---');
        const dataSIS = await pool.request().query("SELECT TipoCalculoId, LEN(TipoCalculoId) as len, DATALENGTH(TipoCalculoId) as datalen FROM SISTiposCalculo");
        console.log('SISTiposCalculo IDs check:', dataSIS.recordset);

        await sql.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}
check();
