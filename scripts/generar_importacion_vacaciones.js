const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Script Generador de Importación de Vacaciones CONTPAQi
 * Uso: node scripts/generar_importacion_vacaciones.js <ruta_al_excel>
 */

const excelPath = process.argv[2];

if (!excelPath) {
    console.error('Error: Debes proporcionar la ruta al archivo Excel.');
    console.log('Uso: node scripts/generar_importacion_vacaciones.js <ruta_al_excel>');
    process.exit(1);
}

if (!fs.existsSync(excelPath)) {
    console.error(`Error: El archivo no existe en la ruta: ${excelPath}`);
    process.exit(1);
}

console.log(`Procesando archivo: ${excelPath}...`);

try {
    const wb = xlsx.readFile(excelPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(ws);

    const inserts = [];
    let currentEmpPim = null;

    function excelDateToSql(serial) {
        if (!serial || isNaN(serial)) return null;
        // Excel dates are days since 1899-12-30
        const date = new Date((serial - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }

    data.forEach(row => {
        const mainCol = row['CONTPAQi'];
        if (!mainCol) return;

        // Detectar línea de empleado: "0001.NOMBRE"
        const empMatch = mainCol.match(/^(\d{4})\.(.+)$/);
        if (empMatch) {
            currentEmpPim = empMatch[1]; // Tomamos el código de 4 dígitos como PIM
            return;
        }

        if (!currentEmpPim) return;

        // Filtrar transacciones de consumo
        if (mainCol === 'Vacaciones tomadas' || mainCol === 'Vac. tomadas antes del registro del empleado') {
            const cant = row['__EMPTY_3']; // Columna de Tomadas
            let fecha = excelDateToSql(row['__EMPTY']); // Fecha registro
            if (!fecha) fecha = excelDateToSql(row['__EMPTY_1']); // Fallback a Fecha inicial

            if (cant && cant > 0) {
                const desc = mainCol === 'Vacaciones tomadas' ? 'Vacaciones tomadas' : 'Saldo inicial (CONTPAQi)';
                const sqlDate = fecha ? `'${fecha}'` : 'GETDATE()';

                inserts.push(`INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion) VALUES ('${currentEmpPim}', ${cant}, ${sqlDate}, '${desc}');`);
            }
        }
    });

    if (inserts.length === 0) {
        console.warn('Advertencia: No se encontraron registros de vacaciones tomadas en el archivo.');
    }

    const sqlScript = `-- ─── IMPORTACIÓN DE VACACIONES DESDE EXCEL CONTPAQi (GENERADO) ────────────────
-- Archivo origen: ${path.basename(excelPath)}
-- Generado el: ${new Date().toLocaleString()}
-- NOTA: Este script utiliza el campo PIM para asociar los empleados.

SET NOCOUNT ON;

-- ─── 0. LIMPIEZA INICIAL ────────────────────────────────────────────────────
IF CURSOR_STATUS('global','cur_emps') >= 0 BEGIN CLOSE cur_emps; DEALLOCATE cur_emps; END
IF CURSOR_STATUS('global','cur_fifo') >= 0 BEGIN CLOSE cur_fifo; DEALLOCATE cur_fifo; END
IF CURSOR_STATUS('global','cur_recalc') >= 0 BEGIN CLOSE cur_recalc; DEALLOCATE cur_recalc; END

IF OBJECT_ID('tempdb..#TmpImportacion') IS NOT NULL DROP TABLE #TmpImportacion;
IF OBJECT_ID('tempdb..#SaldosDisponibles') IS NOT NULL DROP TABLE #SaldosDisponibles;

-- Limpiar saldos actuales para re-importación limpia
DELETE FROM VacacionesSaldosDetalle;
DELETE FROM VacacionesSaldos;
DBCC CHECKIDENT ('VacacionesSaldos', RESEED, 0);
DBCC CHECKIDENT ('VacacionesSaldosDetalle', RESEED, 0);
GO

-- ─── 1. TABLAS TEMPORALES ───────────────────────────────────────────────────
CREATE TABLE #TmpImportacion (
    ImportId    INT IDENTITY(1,1),
    PIM         VARCHAR(50),
    Cantidad    DECIMAL(10,2),
    Fecha       DATE,
    Descripcion VARCHAR(255)
);

CREATE TABLE #SaldosDisponibles (
    SaldoId    INT PRIMARY KEY,
    EmpleadoId INT,
    Restante   DECIMAL(10,2)
);
GO

-- ─── 2. CARGA DE DATOS (GENERADO AUTOMÁTICAMENTE) ───────────────────────────
${inserts.join('\n')}
GO

-- ─── 3. GENERACIÓN DE BOLSAS DE SALDO (SHELL) ───────────────────────────────
DECLARE @EmpId_Loop INT, @FI_Loop DATE;
DECLARE cur_emps CURSOR FOR 
    SELECT DISTINCT e.EmpleadoId, e.FechaIngreso 
    FROM #TmpImportacion t
    JOIN Empleados e ON e.pim = t.PIM; -- BUSQUEDA POR PIM
OPEN cur_emps;
FETCH NEXT FROM cur_emps INTO @EmpId_Loop, @FI_Loop;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Anio_Indice INT = 1;
    WHILE DATEADD(YEAR, @Anio_Indice - 1, @FI_Loop) <= GETDATE()
    BEGIN
        DECLARE @F_Inicio DATE = DATEADD(YEAR, @Anio_Indice - 1, @FI_Loop);
        DECLARE @F_Fin DATE = DATEADD(DAY, -1, DATEADD(YEAR, @Anio_Indice, @FI_Loop));
        
        -- Obtener días según ley para este aniversario
        DECLARE @DiasOtorgados INT = dbo.fn_Vacaciones_GetDiasOtorgados(@F_Fin, @Anio_Indice);

        INSERT INTO VacacionesSaldos (EmpleadoId, Anio, DiasOtorgados, DiasDisfrutados, FechaInicioPeriodo, FechaFinPeriodo)
        VALUES (@EmpId_Loop, @Anio_Indice, @DiasOtorgados, 0, @F_Inicio, @F_Fin);
        
        DECLARE @NewSaldoId INT = SCOPE_IDENTITY();
        INSERT INTO #SaldosDisponibles (SaldoId, EmpleadoId, Restante)
        VALUES (@NewSaldoId, @EmpId_Loop, @DiasOtorgados);
        
        SET @Anio_Indice = @Anio_Indice + 1;
    END
    FETCH NEXT FROM cur_emps INTO @EmpId_Loop, @FI_Loop;
END
CLOSE cur_emps;
DEALLOCATE cur_emps;
GO

-- ─── 4. PROCESAMIENTO FIFO (CONSUMO DE SALDOS) ──────────────────────────────
DECLARE @Imp_Id INT, @Imp_PIM VARCHAR(50), @Imp_Cant DECIMAL(10,2), @Imp_Fec DATE, @Imp_Des VARCHAR(255);
DECLARE cur_fifo CURSOR FOR 
    SELECT ImportId, PIM, Cantidad, Fecha, Descripcion FROM #TmpImportacion ORDER BY ImportId;
OPEN cur_fifo;
FETCH NEXT FROM cur_fifo INTO @Imp_Id, @Imp_PIM, @Imp_Cant, @Imp_Fec, @Imp_Des;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Emp_ID_Int INT;
    SELECT @Emp_ID_Int = EmpleadoId FROM Empleados WHERE pim = @Imp_PIM; -- BUSQUEDA POR PIM
    
    WHILE @Imp_Cant > 0
    BEGIN
        DECLARE @Target_SID INT = NULL;
        DECLARE @Cap_Res DECIMAL(10,2) = 0;
        
        -- Buscar la bolsa más antigua con saldo
        SELECT TOP 1 @Target_SID = s.SaldoId, @Cap_Res = s.Restante
        FROM #SaldosDisponibles s
        JOIN VacacionesSaldos vs ON s.SaldoId = vs.SaldoId
        WHERE s.EmpleadoId = @Emp_ID_Int AND s.Restante > 0
        ORDER BY vs.Anio ASC;

        -- Si no hay bolsas con saldo, aplicar a la última (sobrecupo)
        IF @Target_SID IS NULL
        BEGIN
             SELECT TOP 1 @Target_SID = s.SaldoId, @Cap_Res = 9999
             FROM #SaldosDisponibles s
             JOIN VacacionesSaldos vs ON s.SaldoId = vs.SaldoId
             WHERE s.EmpleadoId = @Emp_ID_Int
             ORDER BY vs.Anio DESC;
        END

        IF @Target_SID IS NULL BREAK;

        DECLARE @Dias_Work DECIMAL(10,2) = CASE WHEN @Imp_Cant <= @Cap_Res THEN @Imp_Cant ELSE @Cap_Res END;
        
        INSERT INTO VacacionesSaldosDetalle (SaldoId, Fecha, Dias, Descripcion, Tipo)
        VALUES (@Target_SID, @Imp_Fec, @Dias_Work, @Imp_Des, 'Migración CONTPAQi');
        
        UPDATE #SaldosDisponibles SET Restante = Restante - @Dias_Work WHERE SaldoId = @Target_SID;
        SET @Imp_Cant = @Imp_Cant - @Dias_Work;
    END
    FETCH NEXT FROM cur_fifo INTO @Imp_Id, @Imp_PIM, @Imp_Cant, @Imp_Fec, @Imp_Des;
END
CLOSE cur_fifo;
DEALLOCATE cur_fifo;
GO

-- ─── 5. RECALCULO FINAL ─────────────────────────────────────────────────────
DECLARE @Recalc_Id INT;
DECLARE cur_recalc CURSOR FOR SELECT DISTINCT EmpleadoId FROM #SaldosDisponibles;
OPEN cur_recalc;
FETCH NEXT FROM cur_recalc INTO @Recalc_Id;
WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC sp_Vacaciones_Recalcular @EmpleadoId = @Recalc_Id, @ReacomodarFIFO = 0;
    FETCH NEXT FROM cur_recalc INTO @Recalc_Id;
END
CLOSE cur_recalc;
DEALLOCATE cur_recalc;
GO

IF OBJECT_ID('tempdb..#TmpImportacion') IS NOT NULL DROP TABLE #TmpImportacion;
IF OBJECT_ID('tempdb..#SaldosDisponibles') IS NOT NULL DROP TABLE #SaldosDisponibles;
PRINT 'Importación FIFO desde Excel CONTPAQi completada exitosamente.';
`;

    const outputPath = path.join(__dirname, '../SQL/import_vacations_contpaq_excel.sql');
    fs.writeFileSync(outputPath, sqlScript);
    console.log(`\x1b[32mÉxito:\x1b[0m Script SQL generado correctamente en: ${outputPath}`);
    console.log(`Se procesaron ${inserts.length} registros de consumo.`);

} catch (err) {
    console.error(`Error al procesar el archivo: ${err.message}`);
    process.exit(1);
}
