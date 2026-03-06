const fs = require('fs');
const path = require('path');
const mssql = require('mssql');
require('dotenv').config({ path: path.join(__dirname, '../.env.deploy') });

const config = {
    user: process.env.DEV_DB_USER,
    password: process.env.DEV_DB_PASSWORD,
    server: process.env.DEV_DB_SERVER,
    database: process.env.DEV_DB_DATABASE,
    port: parseInt(process.env.DEV_DB_PORT || '1433'),
    options: {
        encrypt: false, // For local dev
        trustServerCertificate: true
    }
};

const tablesToExport = [
    'SISConfiguracion',
    'SISPermisos',
    'SISTiposCalculo',
    'SISTiposEventoCalendario',
    'CatalogoEstatusAsistencia',
    'CatalogoNivelesAutorizacion',
    'CatalogoReglasVacaciones',
    'CatalogoTiposIncidencia',
    'ConfiguracionIncidencias',
    'Roles',
    'VacacionesAprobadoresConfig'
];

async function extractSeeds() {
    const seedsDir = path.join(__dirname, '../installer/database/seeds');
    if (!fs.existsSync(seedsDir)) {
        fs.mkdirSync(seedsDir, { recursive: true });
    }

    try {
        console.log(`🔌 Conectando a ${config.server}/${config.database}...`);
        await mssql.connect(config);
        console.log('✅ Conectado.');

        for (const tableName of tablesToExport) {
            console.log(`📋 Extrayendo datos de ${tableName}...`);
            const result = await mssql.query(`SELECT * FROM ${tableName}`);

            const filePath = path.join(seedsDir, `${tableName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(result.recordset, null, 2), 'utf8');
            console.log(`  ✅ Guardado en ${tableName}.json (${result.recordset.length} registros)`);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mssql.close();
        console.log('✅ Terminado.');
    }
}

extractSeeds();
