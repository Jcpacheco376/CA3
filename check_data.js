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

        console.log('\n--- Data in SISTiposCalculo ---');
        const dataSIS = await pool.request().query("SELECT * FROM SISTiposCalculo");
        console.log(JSON.stringify(dataSIS.recordset, null, 2));

        console.log('\n--- Checking current value in CatalogoEstatusAsistencia for this record ---');
        // Let's assume we are editing one of the records. 
        // In the screenshot, the title is "Editar Estatus de Asistencia".
        // The abbreviation is "FGS".
        const statusData = await pool.request().query("SELECT EstatusId, Abreviatura, TipoCalculoId FROM CatalogoEstatusAsistencia WHERE Abreviatura = 'FGS'");
        console.log('Current status record:', statusData.recordset);

        await sql.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}
check();
