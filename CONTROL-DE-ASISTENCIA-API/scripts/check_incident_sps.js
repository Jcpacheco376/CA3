const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'P*V3NT4',
    server: process.env.DB_SERVER || '192.168.0.141',
    database: process.env.DB_DATABASE || 'CA',
    port: 9000,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function test() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected');
        const result = await pool.request().query("SELECT name FROM sys.procedures WHERE name LIKE '%Incidencia%'");
        console.log('Incident Procedures:', result.recordset);

        // Try to get definition of sp_Incidencias_GetDetalle
        const def = await pool.request()
            .input('name', sql.NVarChar, 'sp_Incidencias_GetDetalle')
            .query("SELECT OBJECT_DEFINITION(OBJECT_ID(@name)) as definition");
        console.log('sp_Incidencias_GetDetalle Definition:', def.recordset[0]?.definition ? 'Exists' : 'NOT FOUND');

        if (def.recordset[0]?.definition) {
            console.log(def.recordset[0].definition);
        }

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

test();
