import sql from 'mssql';
import { poolPromise } from '../src/config/database';

async function analyzeSchema() {
    try {
        const pool = await poolPromise;
        const tables = ['Empleados', 'CatalogoDepartamentos', 'CatalogoEstablecimientos', 'CatalogoPuestos'];

        for (const table of tables) {
            const result = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = '${table}'
            `);
            console.log(`--- Columns for ${table} ---`);
            console.table(result.recordset);
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

analyzeSchema();
