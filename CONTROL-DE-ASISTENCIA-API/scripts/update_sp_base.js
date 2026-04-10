const sql = require('mssql');
require('dotenv').config({ path: '../.env' });

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

async function updateSP() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Connected to DB');

        await pool.request().query(`
            CREATE OR ALTER PROCEDURE sp_Vacaciones_GenerarSaldosBase
                @AnioActual INT,
                @EmpleadoId INT = NULL
            AS
            BEGIN
                SET NOCOUNT ON;

                -- 1. Asegurar registro de saldo base (Anniversary Format)
                INSERT INTO VacacionesSaldos (EmpleadoId, Anio, DiasOtorgados, DiasDisfrutados, FechaInicioPeriodo, FechaFinPeriodo)
                SELECT 
                    e.EmpleadoId, 
                    @AnioActual, 
                    dbo.fn_Vacaciones_GetDiasOtorgados(
                        DATEADD(DAY, -1, DATEADD(YEAR, @AnioActual, e.FechaIngreso)),
                        @AnioActual
                    ),
                    0,
                    DATEADD(YEAR, @AnioActual - 1, e.FechaIngreso),
                    DATEADD(DAY, -1, DATEADD(YEAR, @AnioActual, e.FechaIngreso))
                FROM Empleados e
                WHERE e.Activo = 1 
                  AND (@EmpleadoId IS NULL OR e.EmpleadoId = @EmpleadoId)
                  AND NOT EXISTS (
                      SELECT 1 FROM VacacionesSaldos vs 
                      WHERE vs.EmpleadoId = e.EmpleadoId AND vs.Anio = @AnioActual
                  );

                -- 2. Recalcular 'DiasDisfrutados' (Consumo Total)
                DECLARE @ConceptoVacacionesId INT;
                SELECT TOP 1 @ConceptoVacacionesId = cea.ConceptoNominaId
                FROM CatalogoEstatusAsistencia cea
                WHERE cea.Abreviatura = 'VAC';

                IF @ConceptoVacacionesId IS NOT NULL
                BEGIN
                    UPDATE vs
                    SET vs.DiasDisfrutados = 
                        ISNULL((
                            SELECT SUM(vd.Dias)
                            FROM VacacionesSaldosDetalle vd
                            WHERE vd.SaldoId = vs.SaldoId
                              AND vd.Tipo IN ('Disfrutado', 'Ajuste', 'Pagado', 'Saldos Iniciales')
                        ), 0)
                    FROM VacacionesSaldos vs
                    WHERE vs.Anio = @AnioActual
                      AND (@EmpleadoId IS NULL OR vs.EmpleadoId = @EmpleadoId);
                END
            END
        `);
        console.log('SP sp_Vacaciones_GenerarSaldosBase actualizado para manejar indices de aniversario');

        await sql.close();
    } catch (err) {
        console.error('Error: ', err);
        process.exit(1);
    }
}

updateSP();
