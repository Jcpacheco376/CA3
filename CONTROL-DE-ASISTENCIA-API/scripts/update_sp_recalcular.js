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

const SP_SQL = `
CREATE OR ALTER PROCEDURE sp_Vacaciones_Recalcular
    @EmpleadoId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================================
    -- PASO 1: Borrar registros de periodos FUTUROS (no iniciados)
    --         para este empleado. El usuario limpiará los suyos
    --         manualmente, pero el SP también lo garantiza.
    -- =============================================================
    DELETE FROM VacacionesSaldos
    WHERE EmpleadoId = @EmpleadoId
      AND FechaInicioPeriodo > GETDATE();

    -- =============================================================
    -- PASO 2: Crear registros en VacacionesSaldos para periodos
    --         que aparecen en VacacionesSaldosDetalle pero no tienen
    --         fila en VacacionesSaldos (huérfanos).
    --         Esto garantiza consistencia si el detalle tiene más info.
    --         (Caso raro pero defensivo.)
    -- =============================================================
    -- (No aplica directamente: VacacionesSaldosDetalle apunta a SaldoId
    --  que ya existe en VacacionesSaldos. Si no existe el saldo padre,
    --  hay un FK violation, por lo que ignoramos este caso.)

    -- =============================================================
    -- PASO 3: Recalcular DiasOtorgados de cada saldo según las
    --         reglas de ley usando el número de aniversario y la
    --         fecha de ingreso del empleado.
    -- =============================================================
    DECLARE @FechaIngreso DATE;
    SELECT @FechaIngreso = FechaIngreso FROM Empleados WHERE EmpleadoId = @EmpleadoId;

    IF @FechaIngreso IS NULL
    BEGIN
        RAISERROR('Empleado no encontrado o sin fecha de ingreso.', 16, 1);
        RETURN;
    END

    -- Detectar el esquema de ley vigente por año de inicio del periodo
    UPDATE vs
    SET vs.DiasOtorgados = ISNULL((
        SELECT TOP 1 crv.DiasOtorgados
        FROM CatalogoReglasVacaciones crv
        WHERE crv.AniosAntiguedad = vs.Anio
          AND crv.Esquema = CASE
              WHEN YEAR(vs.FechaInicioPeriodo) >= 2023 THEN 'Ley-2023'
              ELSE 'Pre-2023'
          END
        ORDER BY crv.AniosAntiguedad
    ), vs.DiasOtorgados) -- Si no hay regla, mantener lo que tenía
    FROM VacacionesSaldos vs
    WHERE vs.EmpleadoId = @EmpleadoId;

    -- =============================================================
    -- PASO 4: Resetear DiasDisfrutados a 0 en todos los saldos
    --         de este empleado. Lo recalcularemos desde el detalle.
    -- =============================================================
    UPDATE VacacionesSaldos
    SET DiasDisfrutados = 0
    WHERE EmpleadoId = @EmpleadoId;

    -- =============================================================
    -- PASO 5: Aplicar todos los movimientos (Disfrutados, Ajustes, Pagados)
    --         directamente a su SaldoId. 
    --         Recalcular NO reasigna SaldoId, respeta el que ya venga.
    -- =============================================================
    UPDATE vs
    SET vs.DiasDisfrutados = ISNULL((
        SELECT SUM(vd.Dias)
        FROM VacacionesSaldosDetalle vd
        WHERE vd.SaldoId = vs.SaldoId
          AND vd.Tipo IN ('Disfrutado', 'Ajuste', 'Pagado')
    ), 0)
    FROM VacacionesSaldos vs
    WHERE vs.EmpleadoId = @EmpleadoId;

END
`;

async function updateSP() {
    try {
        const pool = await sql.connect(dbConfig);
        console.log('Conectado a BD. Creando sp_Vacaciones_Recalcular...');
        await pool.request().query(SP_SQL);
        console.log('✅ sp_Vacaciones_Recalcular creado/actualizado correctamente.');
        await sql.close();
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

updateSP();
