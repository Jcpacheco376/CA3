
const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'P*V3NT4',
    server: process.env.DB_SERVER || '192.168.0.141',
    database: process.env.DB_DATABASE || 'CA',
    port: 9000,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function runFix() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(dbConfig);
        console.log('Connected.');

        console.log('Updating sp_Empleados_GetAll to restore missing fields...');
        await pool.query(`
            ALTER PROCEDURE [dbo].[sp_Empleados_GetAll]
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    e.EmpleadoId, e.CodRef, e.Pim, e.NombreCompleto, e.DepartamentoId, e.PuestoId, e.Activo, e.Imagen,
                    e.HorarioIdPredeterminado,
                    
                    d.Nombre AS DepartamentoNombre,
                    p.Nombre AS PuestoNombre,
                    h.Nombre AS HorarioNombre,
                    h.EsRotativo,
                    
                    -- Retornamos Zonas como JSON para que el frontend pueda parsearlo y mostrar los nombres en el tooltip
                    (
                        SELECT z.Nombre
                        FROM EmpleadosZonas ez
                        INNER JOIN Zonas z ON ez.ZonaId = z.ZonaId
                        WHERE ez.EmpleadoId = e.EmpleadoId
                        FOR JSON PATH
                    ) AS Zonas,
                    
                    (SELECT COUNT(*) FROM EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId) as ZonasCount

                FROM Empleados e
                LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
                LEFT JOIN CatalogoPuestos p ON e.PuestoId = p.PuestoId
                LEFT JOIN CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
                ORDER BY e.NombreCompleto;
            END
        `);

        console.log('sp_Empleados_GetAll updated successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Fix failed:', err);
        process.exit(1);
    }
}

runFix();
