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
            // Test sp_Incidencias_Resolver with a comment (don't actually change much if possible, or use a neutral action)
            // But we don't have a neutral action easily.
            // Let's just see if it compiles and executes without THROWING a "SET options" error.
            // We'll roll back.
            const transaction = new sql.Transaction(pool);
            await transaction.begin();
            try {
                const request = new sql.Request(transaction);
                await request
                    .input('IncidenciaId', sql.Int, id)
                    .input('NuevoEstatusAbrev', sql.NVarChar(10), 'F') // Just a test
                    .input('Comentario', sql.NVarChar(255), 'Prueba de sistema')
                    .input('UsuarioAccionId', sql.Int, 1)
                    .execute('sp_Incidencias_Resolver');
                console.log('EXEC Success (Simulation)');
            } catch (e) {
                console.error('EXEC failed:', e.message);
            }
            await transaction.rollback();
            console.log('Transaction rolled back.');
        } catch (e) {
            console.error('SP EXEC failed:', e.message);
        }

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

test();
