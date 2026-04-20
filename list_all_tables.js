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

        console.log('\n--- ALL Tables in the DB ---');
        const allTables = await pool.request().query("SELECT name FROM sys.tables ORDER BY name");
        console.log(allTables.recordset.map(t => t.name).join(', '));

        console.log('\n--- Checking if SistemaTiposCalculo exists (sys.objects) ---');
        const obj = await pool.request().query("SELECT name, type_desc FROM sys.objects WHERE name = 'SistemaTiposCalculo'");
        console.log('Object:', obj.recordset);

        await sql.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}
check();
