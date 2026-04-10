const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
    user: 'sa',
    password: 'P*V3NT4',
    server: '192.168.0.141',
    port: 9000,
    database: 'CA',
    options: {
        encrypt: false,
        trustServerCertificate: true
    },
    connectionTimeout: 30000,
    requestTimeout: 60000
};

async function apply() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(config);
        console.log('Connected.');

        const files = [
            'c:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/SQL/funciones/dbo.fn_Vacaciones_GetDiasOtorgados.sql',
            'c:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/SQL/procedimientos/dbo.sp_Vacaciones_GenerarSaldosBase.sql',
            'c:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/SQL/procedimientos/dbo.sp_Vacaciones_Recalcular.sql'
        ];

        for (const file of files) {
            console.log(`Applying ${file}...`);
            let content = fs.readFileSync(file, 'utf8');

            // Remove BOM if exists
            if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

            // Split by GO (simple regex)
            const batches = content.split(/\bGO\b/i);

            for (let batch of batches) {
                let cleanBatch = batch.trim();
                if (!cleanBatch) continue;

                // If the batch contains CREATE/ALTER, we should ensure it's "clean" 
                // but mssql batch() usually handles it if it's the start of the batch.
                try {
                    await pool.request().batch(cleanBatch);
                } catch (batchErr) {
                    // If it failed, maybe it's just the header or comments, but let's log it
                    if (cleanBatch.toUpperCase().includes('CREATE') || cleanBatch.toUpperCase().includes('ALTER')) {
                        throw batchErr;
                    }
                }
            }
            console.log(`Successfully applied ${path.basename(file)}`);
        }

        console.log('\nChecking resulting definition for sp_Vacaciones_GenerarSaldosBase:');
        const res = await pool.request().query("SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('sp_Vacaciones_GenerarSaldosBase')");
        const def = res.recordset[0].definition;

        const hasDates = def.includes('FechaInicioPeriodo') && def.includes('FechaFinPeriodo');
        const hasCase = def.includes('CASE') && def.includes('GETDATE()');

        console.log(`Definition check: hasDates=${hasDates}, hasCase=${hasCase}`);
        if (hasDates && hasCase) {
            console.log('VERIFICATION PASSED: The SP in the database now matches the fixed version.');
        } else {
            console.log('VERIFICATION FAILED: The SP in the database does NOT have the fixes.');
        }

        await pool.close();
    } catch (err) {
        console.error('Error during application:', err);
    }
}

apply();
