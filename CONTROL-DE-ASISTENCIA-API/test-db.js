
const sql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function test() {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT ConfigKey, ConfigValue FROM SISConfiguracion WHERE ConfigKey LIKE 'Filtro%Activo'");
        console.log('Filter Config:', JSON.stringify(result.recordset, null, 2));
        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
