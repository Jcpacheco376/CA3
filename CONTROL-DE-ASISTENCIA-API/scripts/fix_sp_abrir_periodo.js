const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

async function fixSP() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to DB');

        const spName = 'sp_Nomina_AbrirPeriodo';

        // 1. Obtener definición actual
        const result = await pool.request().query(`
            SELECT OBJECT_DEFINITION(OBJECT_ID('${spName}')) AS definition
        `);

        let definition = result.recordset[0]?.definition;

        if (!definition) {
            console.error(`SP ${spName} not found`);
            process.exit(1);
        }

        console.log('Current definition found. Checking for @EmpleadoId...');

        if (definition.includes('@EmpleadoId')) {
            console.log('SP already contains @EmpleadoId. No changes needed.');
        } else {
            console.log('Adding @EmpleadoId to SP...');

            // Reemplazar la declaración de parámetros para incluir @EmpleadoId
            // Buscamos después de la lista de parámetros existente
            // Parámetros actuales: @GrupoNominaId, @FechaInicio, @FechaFin, @UsuarioId, @Motivo

            // Usamos un regex para insertar el nuevo parámetro
            // Buscamos el final de la lista de parámetros (antes del AS)
            definition = definition.replace(
                /(@Motivo\s+NVAR\w+\(\w+\))/i,
                '$1,\n    @EmpleadoId INT = NULL'
            );

            // Modificar la lógica de WHERE para incluir el filtro de empleado
            // Buscamos la sección de UPDATE y modificamos el WHERE
            const whereRegex = /WHERE\s+GrupoNominaId\s*=\s*@GrupoNominaId\s+AND\s+Fecha\s+BETWEEN\s+@FechaInicio\s+AND\s+@FechaFin/gi;

            if (definition.match(whereRegex)) {
                definition = definition.replace(whereRegex, (match) => {
                    return match + '\n      AND (@EmpleadoId IS NULL OR EmpleadoId = @EmpleadoId)';
                });
            } else {
                console.warn('Could not find standard WHERE clause to update. Manual check required.');
            }

            // Cambiar CREATE por ALTER
            definition = definition.replace(/CREATE\s+PROCEDURE/i, 'ALTER PROCEDURE');

            await pool.request().query(definition);
            console.log('SP updated successfully with @EmpleadoId support.');
        }

        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

fixSP();
