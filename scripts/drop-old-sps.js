const sql = require('mssql');
require('dotenv').config({ path: '.env.deploy' });

const config = {
    user: process.env.DEV_DB_USER,
    password: process.env.DEV_DB_PASSWORD,
    server: process.env.DEV_DB_SERVER,
    database: process.env.DEV_DB_DATABASE,
    port: parseInt(process.env.DEV_DB_PORT || '1433'),
    options: { trustServerCertificate: true }
};

sql.connect(config).then(pool => {
    return pool.request().query('IF OBJECT_ID(\'dbo.sp_TiposEventoCalendario_GetAll\', \'P\') IS NOT NULL DROP PROCEDURE dbo.sp_TiposEventoCalendario_GetAll;');
}).then(() => {
    console.log('✅ Dropped sp_TiposEventoCalendario_GetAll');
    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
