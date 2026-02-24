const sql = require('mssql');
require('dotenv').config({ path: '../.env' }); // Adjust if needed

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

async function check() {
    try {
        const pool = await sql.connect(dbConfig);
        const result1 = await pool.request().query(`
            SELECT u.UsuarioId, u.NombreUsuario, u.NombreCompleto, e.EmpleadoId, e.NombreCompleto as EmpNombreCompleto
            FROM Usuarios u
            LEFT JOIN Empleados e ON u.NombreCompleto = e.NombreCompleto
        `);
        console.log("Joined by name:", result1.recordset);

        const result2 = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Usuarios'
        `);
        console.log("Validating columns again...", result2.recordset.map(r => r.COLUMN_NAME));

        await sql.close();
    } catch (err) {
        console.error('Error: ', err);
    }
}

check();
