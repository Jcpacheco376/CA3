const sql = require('mssql');
const fs = require('fs');

async function test() {
    const cfg = {
        server: 'localhost',
        database: 'CA', // Assume DB is CA since logs say "Conectado a localhost/CA"
        user: 'sa',
        password: '123', // I don't know the password, let's just connect with integrated security or see if we can read it from appConfig
        options: { trustServerCertificate: true, encrypt: false }
    };

    // Let's try to parse the config from env
    require('dotenv').config({ path: 'c:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/app/api-asistencia/.env' });
    if (process.env.DB_SERVER) cfg.server = process.env.DB_SERVER;
    if (process.env.DB_DATABASE) cfg.database = process.env.DB_DATABASE;
    if (process.env.DB_USER) cfg.user = process.env.DB_USER;
    if (process.env.DB_PASSWORD) cfg.password = process.env.DB_PASSWORD;

    let pool;
    try {
        pool = await sql.connect(cfg);
        console.log('Connected to SQL Server');

        let sqlTextOrig = fs.readFileSync('c:/Users/SISTEMAS/Documents/VSC-PROJECTS/CA3/SQL/procedimientos/dbo.sp_CatalogoConceptosNomina_GetAll.sql', 'utf8');
        if (sqlTextOrig.charCodeAt(0) === 0xFEFF) sqlTextOrig = sqlTextOrig.slice(1);

        const lines = sqlTextOrig.split(/\r?\n/);
        let first = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line !== '' && !line.startsWith('--')) {
                first = i; break;
            }
        }
        let stripped = lines.slice(first).join('\n').trim();

        // This is pure, raw string
        console.log('--- EXECUTING ---');
        console.log(stripped.slice(0, 100));
        await pool.request().query(stripped);
        console.log('SUCCESS!');

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        if (pool) pool.close();
    }
}
test();
