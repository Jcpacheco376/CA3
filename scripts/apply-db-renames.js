const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.deploy' });

const dbConfig = {
    user: process.env.DEV_DB_USER || 'sa',
    password: process.env.DEV_DB_PASSWORD || 'P*V3NT4',
    server: process.env.DEV_DB_SERVER || '192.168.0.141',
    database: process.env.DEV_DB_DATABASE || 'CA',
    port: parseInt(process.env.DEV_DB_PORT) || 9000,
    options: { encrypt: false, trustServerCertificate: true }
};

async function run() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('✅ Connected to DB');

        // 1. Rename tables
        const renames = [
            { old: 'ConfiguracionSistema', new: 'SISConfiguracion' },
            { old: 'Permisos', new: 'SISPermisos' },
            { old: 'SistemaTiposCalculo', new: 'SISTiposCalculo' },
            { old: 'TiposEventoCalendario', new: 'SISTiposEventoCalendario' }
        ];

        for (const r of renames) {
            try {
                // Check if old table exists
                const check = await pool.request().query(`SELECT 1 FROM sys.tables WHERE name = '${r.old}'`);
                if (check.recordset.length > 0) {
                    await pool.request().query(`EXEC sp_rename '${r.old}', '${r.new}'`);
                    console.log(`✅ Renamed table ${r.old} to ${r.new}`);
                } else {
                    console.log(`⚠️ Table ${r.old} not found (already renamed?)`);
                }
            } catch (err) {
                console.error(`❌ Failed to rename ${r.old}: ${err.message}`);
            }
        }

        // 2. Re-apply functions in LEGACY first to fix binding errors before SPs
        const legacyDir = path.join(__dirname, '..', 'SQL', 'LEGACY');
        if (fs.existsSync(legacyDir)) {
            const legacyFiles = fs.readdirSync(legacyDir).filter(f => f.endsWith('.sql'));
            console.log(`\n⏳ Applying ${legacyFiles.length} functions from LEGACY...`);
            for (const file of legacyFiles) {
                // Read as utf16le just in case it's from SSMS, or fallback to utf8
                let content;
                try {
                    content = fs.readFileSync(path.join(legacyDir, file), 'utf8');
                    if (content.includes('\u0000')) {
                        content = fs.readFileSync(path.join(legacyDir, file), 'utf16le');
                    }
                } catch (e) {
                    content = fs.readFileSync(path.join(legacyDir, file), 'utf16le');
                }

                content = content.replace(/ConfiguracionSistema/g, 'SISConfiguracion');
                content = content.replace(/(?<![a-zA-Z0-9_])(\[?dbo\]?\.\[?)?Permisos(\]?)(?![a-zA-Z0-9_])/g, (m) => m.includes('dbo') ? 'dbo.SISPermisos' : (m.includes('[') ? '[SISPermisos]' : 'SISPermisos'));
                content = content.replace(/SistemaTiposCalculo/g, 'SISTiposCalculo');
                content = content.replace(/TiposEventoCalendario/g, 'SISTiposEventoCalendario');

                const batches = content.split(/\bGO\b/i).filter(b => b.trim().length > 0);
                for (const batch of batches) {
                    try {
                        await pool.request().batch(batch);
                    } catch (err) {
                        console.error(`❌ Error in ${file}: ${err.message}`);
                    }
                }
            }
        }

        // 3. Re-apply all modified SPs to fix invalid references
        const spDir = path.join(__dirname, '..', 'SQL', 'procedimientos');
        const files = fs.readdirSync(spDir).filter(f => f.endsWith('.sql'));

        console.log(`\n⏳ Applying ${files.length} stored procedures to DEv DB...`);
        for (const file of files) {
            const content = fs.readFileSync(path.join(spDir, file), 'utf8');
            // SPs might have GO batches, we must just execute the CREATE OR ALTER batch
            // The export-sql removes GOs mostly, but let's be safe.
            const batches = content.split(/\bGO\b/i).filter(b => b.trim().length > 0);
            for (const batch of batches) {
                try {
                    await pool.request().batch(batch);
                } catch (err) {
                    console.error(`❌ Error in ${file}: ${err.message}`);
                }
            }
        }
        console.log('✅ Stored procedures re-applied successfully.');

        process.exit(0);

    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

run();
