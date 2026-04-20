import { poolPromise } from '../src/config/database';
import fs from 'fs';
import path from 'path';

async function applySql() {
    try {
        console.log('Obtaining DB connection pooling...');
        const pool = await poolPromise;
        const files = [
            'dbo.sp_FichasAsistencia_GetDataByRange.sql'
        ];

        for (const file of files) {
            console.log(`Processing file: ${file}`);
            const sqlPath = path.resolve(__dirname, `../../SQL/procedimientos/${file}`);
            const rawContent = fs.readFileSync(sqlPath, 'utf8');
            const queries = rawContent.split(/\bGO\b/i).filter(q => q.replace(/[\s\r\n]+/g, '').length > 0);
            for (let q of queries) {
                await pool.request().batch(q);
            }
            console.log(`Stored procedure ${file} successfully applied.`);
        }
        process.exit(0);
    } catch (err) {
        console.error('Error applying SQL:', err);
        process.exit(1);
    }
}
applySql();
