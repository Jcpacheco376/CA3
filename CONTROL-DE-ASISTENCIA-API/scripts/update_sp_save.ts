import fs from 'fs';
import path from 'path';
import sql from 'mssql';
import { dbConfig } from '../src/config/database';

async function updateSP(pool: any, filename: string) {
    const sqlPath = path.join(__dirname, '../../SQL/procedimientos', filename);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    const batches = sqlContent.split(/\bGO\b/i);
    for (const batch of batches) {
        if (batch.trim().length > 0) {
            await pool.request().batch(batch);
        }
    }
    console.log(`SP ${filename} updated successfully.`);
}

async function main() {
    try {
        const pool = await sql.connect(dbConfig);
        await updateSP(pool, 'dbo.sp_Empleados_Save.sql');
        await updateSP(pool, 'dbo.sp_SyncFromBMS.sql');
        process.exit(0);
    } catch (err) {
        console.error('Error updating SPs:', err);
        process.exit(1);
    }
}

main();
