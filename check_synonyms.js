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

        console.log('\n--- Checking Synonyms ---');
        const synonyms = await pool.request().query("SELECT name, base_object_name FROM sys.synonyms");
        console.log('Synonyms:', synonyms.recordset);

        console.log('\n--- All Records in CatalogoEstatusAsistencia ---');
        const allStatuses = await pool.request().query("SELECT EstatusId, Abreviatura, Descripcion, TipoCalculoId FROM CatalogoEstatusAsistencia");
        console.log('Statuses:', allStatuses.recordset);

        console.log('\n--- Details of FK FK_CatalogoEstatus_SistemaTipos ---');
        const fkDetails = await pool.request().query(`
            SELECT OBJECT_NAME(referenced_object_id) as RefTable, name 
            FROM sys.foreign_keys 
            WHERE name = 'FK_CatalogoEstatus_SistemaTipos'
        `);
        console.log('FK detail:', fkDetails.recordset);

        await sql.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}
check();
