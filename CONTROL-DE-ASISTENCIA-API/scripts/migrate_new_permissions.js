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

async function migratePermissions() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(dbConfig);
        console.log('Connected.');

        // 1. Precise sync for Vacations and Calendar permissions
        const permissions = [
            { id: 51, name: 'vacaciones.read', desc: 'Permite ver sus propias solicitudes y saldos de vacaciones' },
            { id: 52, name: 'vacaciones.manage', desc: 'Permite crear y gestionar solicitudes de vacaciones' },
            { id: 53, name: 'vacaciones.approve', desc: 'Permite autorizar o rechazar solicitudes de vacaciones' },
            { id: 54, name: 'calendario.read', desc: 'Permite ver el calendario de eventos y feriados' },
            { id: 55, name: 'calendario.manage', desc: 'Permite gestionar (crear, editar, eliminar) eventos del calendario' }
        ];

        console.log('Cleaning existing potentially conflicting permissions in range 51-55...');
        // Delete by IDs or names to avoid duplication during swap
        const names = permissions.map(p => `'${p.name}'`).join(',');
        await pool.request().query(`DELETE FROM RolesPermisos WHERE PermisoId IN (51,52,53,54,55)`);
        await pool.request().query(`DELETE FROM SISPermisos WHERE PermisoId IN (51,52,53,54,55) OR NombrePermiso IN (${names})`);

        for (const p of permissions) {
            console.log(`Inserting permission: ${p.name} (ID: ${p.id})`);
            await pool.request()
                .input('id', sql.Int, p.id)
                .input('name', sql.VarChar, p.name)
                .input('desc', sql.VarChar, p.desc)
                .query(`
                    INSERT INTO SISPermisos (PermisoId, NombrePermiso, Descripcion, Activo) 
                    VALUES (@id, @name, @desc, 1);
                `);
        }

        // 2. Assign these new permissions to the Administrator role (RoleId = 1)
        console.log('Assigning new permissions to Administrator role...');
        for (const p of permissions) {
            await pool.request()
                .input('id', sql.Int, p.id)
                .query(`
                    INSERT INTO RolesPermisos (RoleId, PermisoId) VALUES (1, @id);
                `);
        }

        console.log("Migration completed successfully.");
        await sql.close();
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migratePermissions();
