const sql = require('mssql');
require('dotenv').config({ path: 'C:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/CONTROL-DE-ASISTENCIA-API/.env' });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function check() {
    try {
        console.log('Using config:', { ...dbConfig, password: '***' });
        const pool = await sql.connect(dbConfig);
        console.log('Connected to DB');

        console.log('\n--- Checking Tables Names ---');
        const tables = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME LIKE '%TiposCalculo%'");
        console.log('Found tables:', tables.recordset);

        console.log('\n--- Checking FK Constraints for CatalogoEstatusAsistencia ---');
        const fks = await pool.request().query(`
            SELECT 
                f.name AS ForeignKey,
                OBJECT_NAME(f.parent_object_id) AS TableName,
                COL_NAME(fc.parent_object_id, fc.parent_column_id) AS ColumnName,
                OBJECT_NAME (f.referenced_object_id) AS ReferencedTable,
                COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS ReferencedColumn
            FROM sys.foreign_keys AS f
            INNER JOIN sys.foreign_key_columns AS fc ON f.OBJECT_ID = fc.constraint_object_id
            WHERE OBJECT_NAME(f.parent_object_id) = 'CatalogoEstatusAsistencia'
        `);
        console.log('FKs:', fks.recordset);

        await sql.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}
check();
