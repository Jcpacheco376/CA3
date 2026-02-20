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

async function checkCatalogs() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log("--- CatalogoTiposIncidencia ---");
        const tipos = await pool.request().query("SELECT * FROM CatalogoTiposIncidencia");
        console.dir(tipos.recordset);

        console.log("--- CatalogoEstatusAsistencia ---");
        const estatus = await pool.request().query("SELECT * FROM CatalogoEstatusAsistencia WHERE Nombre LIKE '%Vac%' OR Abreviatura LIKE '%VAC%' OR Descripcion LIKE '%Vac%'");
        console.dir(estatus.recordset);

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
checkCatalogs();
