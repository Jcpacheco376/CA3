const sql = require('mssql');
require('dotenv').config({ path: '../.env' });
const cfg = {
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost', port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE,
    options: { encrypt: process.env.DB_ENCRYPT === 'true', trustServerCertificate: true }
};
async function main() {
    const p = await sql.connect(cfg);
    const s = await p.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='VacacionesSaldos' ORDER BY ORDINAL_POSITION");
    const d = await p.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='VacacionesSaldosDetalle' ORDER BY ORDINAL_POSITION");
    const det = await p.request().query("SELECT TOP 5 * FROM VacacionesSaldosDetalle ORDER BY Fecha");
    const r = await p.request().query("SELECT TOP 3 * FROM CatalogoReglasVacaciones");
    console.log('SALDOS COLS:', JSON.stringify(s.recordset));
    console.log('DETALLE COLS:', JSON.stringify(d.recordset));
    console.log('DETALLE SAMPLE:', JSON.stringify(det.recordset));
    console.log('REGLAS SAMPLE:', JSON.stringify(r.recordset));
    await sql.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
