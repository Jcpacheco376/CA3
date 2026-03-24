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

        // Let's find one valid incident ID
        const list = await pool.request().query("SELECT TOP 1 IncidenciaId FROM Incidencias");
        if (list.recordset.length === 0) {
            console.log('No incidents found to test');
            return;
        }
        const id = list.recordset[0].IncidenciaId;
        console.log('Testing with Incident ID:', id);

        try {
            const result = await pool.request()
                .input('IncidenciaId', sql.Int, id)
                .execute('sp_Incidencias_GetDetalle');
            console.log('Result Success. Rows in header:', result.recordsets[0].length);
        } catch (e) {
            console.error('SP EXEC failed:', e.message);
        }

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

test();
