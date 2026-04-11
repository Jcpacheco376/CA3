const path = require('path');
const { analyzeDatabase } = require('./steps/db-analyzer');
const { applyDatabase } = require('./steps/db-apply');

const cfg = {
    DB_SERVER: 'SQL5110.site4now.net',
    DB_DATABASE: 'db_ac7ea1_ca',
    DB_USER: 'db_ac7ea1_ca_admin',
    DB_PASSWORD: '1q2w3e4r',
    DB_PORT: 1433
};

async function run() {
    try {
        console.log('🔍 Analizando base de datos destino...');
        const analysis = await analyzeDatabase(cfg, __dirname);

        console.log('⚙️ Aplicando esquema y procedimientos...');
        await applyDatabase(cfg, analysis, __dirname, console.log, (p) => {
            if (p % 0.2 < 0.05) console.log(`Progreso: ${(p * 100).toFixed(0)}%`);
        });

        console.log('✅ Base de datos aprovisionada correctamente.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error fatal:', e);
        process.exit(1);
    }
}

run();
