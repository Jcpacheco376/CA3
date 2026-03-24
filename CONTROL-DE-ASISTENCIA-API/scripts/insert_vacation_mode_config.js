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
    // Solo insertar si no existe
    await p.request().query(`
        IF NOT EXISTS (SELECT 1 FROM SISConfiguracion WHERE ConfigKey = 'VacacionesModoOtorgamiento')
        BEGIN
            INSERT INTO SISConfiguracion (ConfigKey, ConfigValue, Descripcion)
            VALUES ('VacacionesModoOtorgamiento', 'FIN',
                'Modo de otorgamiento de vacaciones: FIN = Al cumplir aniversario, DEV = Proporcional/Devengado, INI = Desde inicio de periodo');
            PRINT 'Registro insertado.';
        END
        ELSE
            PRINT 'Ya existe el registro.';
    `);
    console.log('✅ Config VacacionesModoOtorgamiento verificado/insertado.');
    await sql.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
