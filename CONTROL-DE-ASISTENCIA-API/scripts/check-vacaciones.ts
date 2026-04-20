import sql from 'mssql';
import { poolPromise } from '../src/config/database';

async function findTables() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE '%Vacacion%'
        `);
        console.table(result.recordset);

        // Let's also check the schema of the first 2 tables found
        for (const row of result.recordset) {
            const schemaRes = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${row.TABLE_NAME}'
            `);
            console.log(`\n--- Schema for ${row.TABLE_NAME} ---`);
            console.table(schemaRes.recordset);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
findTables();
