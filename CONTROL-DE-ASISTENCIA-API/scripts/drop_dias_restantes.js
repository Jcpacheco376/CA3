const sql = require('mssql');
require('dotenv').config({ path: '../.env' });

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

async function dropColumn() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected to DB');

        // Eliminar la columna calculada para dejar el cálculo al vuelo en la lógica de negocio
        await pool.request().query(`
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('VacacionesSaldos') AND name = 'DiasRestantes')
            BEGIN
                ALTER TABLE VacacionesSaldos DROP COLUMN DiasRestantes;
                PRINT 'Columna DiasRestantes eliminada.';
            END
        `);

        await sql.close();
    } catch (err) {
        console.error('Error: ', err);
    }
}

dropColumn();
