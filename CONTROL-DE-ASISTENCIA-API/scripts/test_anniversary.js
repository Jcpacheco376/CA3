const sql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function run() {
    try {
        console.log('Connecting to database:', dbConfig.server, 'Port:', dbConfig.port);
        await sql.connect(dbConfig);
        console.log('Connected.');

        console.log('Executing sp_Empleados_GetAnniversaries...');
        const result = await new sql.Request()
            .input('Months', sql.NVarChar, '1,2,3')
            .execute('sp_Empleados_GetAnniversaries');

        console.log('Success! Count:', result.recordset.length);
        console.log('Sample:', result.recordset[0]);
        process.exit(0);
    } catch (err) {
        console.error('FAILED with error:');
        console.error(err);
        process.exit(1);
    }
}

run();
