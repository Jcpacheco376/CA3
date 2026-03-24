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
        const result = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UsuariosRoles'");
        console.log('UsuariosRoles Columns:', result.recordset.map(r => r.COLUMN_NAME));
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
test();
