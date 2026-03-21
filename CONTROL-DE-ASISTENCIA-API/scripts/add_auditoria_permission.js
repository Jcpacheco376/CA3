const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
        console.log('Connecting to DB...');
        const pool = await sql.connect(dbConfig);
        console.log('Connected');

        const result = await pool.request().query('SELECT PermisoId, NombrePermiso FROM SISPermisos');
        console.log('Current permissions:', result.recordset);

        // Check if `asistencia.auditar` exists
        const exists = result.recordset.some(p => p.NombrePermiso === 'asistencia.auditar');

        if (!exists) {
            console.log('Adding "asistencia.auditar"...');
            // Insert it
            const insertRes = await pool.request().query(`
                DECLARE @NewId INT;
                SELECT @NewId = ISNULL(MAX(PermisoId), 0) + 1 FROM SISPermisos;
                
                INSERT INTO SISPermisos (PermisoId, NombrePermiso, Descripcion, Activo) 
                VALUES (@NewId, 'asistencia.auditar', 'Aceso al panel de auditoria de checadas en el timeline', 1);

                INSERT INTO RolesPermisos (RoleId, PermisoId) VALUES (1, @NewId);
            `);
            console.log('Inserted and assigned to admin (RoleId=1).');
        } else {
            console.log('Permission "asistencia.auditar" already exists.');
        }

        await sql.close();
    } catch (e) {
        console.error('Error:', e);
    }
}

addPermission();
