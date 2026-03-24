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

        try {
            const res = await pool.request().query("SELECT CAST('false' AS BIT) as test");
            console.log('Result:', res.recordset);
        } catch (e) {
            console.error('CAST failed:', e.message);
        }

        await sql.close();
    } catch (err) {
        console.error(err);
    }
}

test();
