const sql = require('mssql');
require('dotenv').config({ path: '../.env' }); // or the correct env path

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT) || 1433,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function addPermission() {
    try {
        const pool = await sql.connect(dbConfig);

        // Ensure "vacaciones.manage" exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM SISPermisos WHERE NombrePermiso = 'vacaciones.manage')
            BEGIN
                DECLARE @NewId INT;
                SELECT @NewId = ISNULL(MAX(PermisoId), 0) + 1 FROM SISPermisos;
                
                INSERT INTO SISPermisos (PermisoId, NombrePermiso, Descripcion, Activo) 
                VALUES (@NewId, 'vacaciones.manage', 'Administrar solicitudes y saldos de vacaciones', 1)
            END
        `);

        console.log("Permission added.");
        await sql.close();
    } catch (err) {
        console.error(err);
    }
}
addPermission();
