-- ─── IMPORTACIÓN DE VACACIONES DESDE BMSJS (NÓMINAS SQL) ─────────────────────
-- Este script importa los consumos históricos de vacaciones desde BMSJS.
-- Incluye una opción para evitar que un solo registro de nómina se divida entre dos bolsas de saldo.

SET NOCOUNT ON;

-- ─── CONFIGURACIÓN ─────────────────────────────────────────────────────────
DECLARE @SplitConsumo BIT = 0; -- 1: Divide el registro si excede el saldo del año (estricto)
                               -- 0: Aplica el registro completo al año más antiguo (con sobrecupo)

-- ─── 0. LIMPIEZA INICIAL ────────────────────────────────────────────────────
IF CURSOR_STATUS('global','cur_emps') >= 0 BEGIN CLOSE cur_emps; DEALLOCATE cur_emps; END
IF CURSOR_STATUS('global','cur_fifo') >= 0 BEGIN CLOSE cur_fifo; DEALLOCATE cur_fifo; END
IF CURSOR_STATUS('global','cur_recalc') >= 0 BEGIN CLOSE cur_recalc; DEALLOCATE cur_recalc; END

IF OBJECT_ID('tempdb..#TmpImportacion') IS NOT NULL DROP TABLE #TmpImportacion;
IF OBJECT_ID('tempdb..#SaldosDisponibles') IS NOT NULL DROP TABLE #SaldosDisponibles;

DELETE FROM VacacionesSaldosDetalle;
DELETE FROM VacacionesSaldos;
DBCC CHECKIDENT ('VacacionesSaldos', RESEED, 0);
DBCC CHECKIDENT ('VacacionesSaldosDetalle', RESEED, 0);
GO

-- ─── 1. TABLAS TEMPORALES ───────────────────────────────────────────────────
CREATE TABLE #TmpImportacion (
    ImportId    INT IDENTITY(1,1),
    CodRef      VARCHAR(50),
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

-- ─── 2. CARGA DE DATOS ORIGEN (BMSJS) ───────────────────────────────────────
INSERT INTO #TmpImportacion (CodRef, Cantidad, Fecha, Descripcion)
SELECT 
    CAST(e.empleado AS VARCHAR(50)), 
    m.cantidad, 
    n.fecha, 
    'Nom: ' + n.folio
FROM BMSJS.dbo.nominas n
INNER JOIN BMSJS.dbo.mnominas_conceptos m ON n.folio = m.folio AND n.transaccion = m.transaccion
INNER JOIN BMSJS.dbo.empleados e ON m.empleado = e.empleado
INNER JOIN dbo.Empleados empLocal ON CAST(e.empleado AS VARCHAR(50)) = empLocal.CodRef
WHERE m.concepto_nomina = '08' -- Concepto de Vacaciones en BMS
  AND n.status = 'v' 
  AND e.status_empleado = '1'
  AND n.fecha >= empLocal.FechaIngreso -- Solo considerar fechas posteriores al reingreso actual
ORDER BY n.fecha ASC;
GO

-- ─── 3. GENERACIÓN DE BOLSAS DE SALDO (FIFO SHELL) ──────────────────────────
DECLARE @EmpId_Loop INT, @FI_Loop DATE;
DECLARE cur_emps CURSOR FOR 
    SELECT DISTINCT e.EmpleadoId, e.FechaIngreso 
    FROM #TmpImportacion t
    JOIN Empleados e ON e.CodRef = t.CodRef;
OPEN cur_emps;
FETCH NEXT FROM cur_emps INTO @EmpId_Loop, @FI_Loop;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Anio_Indice INT = 1;
    WHILE DATEADD(YEAR, @Anio_Indice - 1, @FI_Loop) <= GETDATE()
    BEGIN
        DECLARE @F_Inicio DATE = DATEADD(YEAR, @Anio_Indice - 1, @FI_Loop);
        DECLARE @F_Fin DATE = DATEADD(DAY, -1, DATEADD(YEAR, @Anio_Indice, @FI_Loop));
        
        DECLARE @DiasOtorgados INT = ISNULL(dbo.fn_Vacaciones_GetDiasOtorgados(@F_Fin, @Anio_Indice), 0);

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
-- Recuperamos la configuración de fragmentación
DECLARE @SplitConsumoInternal BIT = 0; 
-- (Nota: Para scripts SQL de un solo bloque, las variables declaradas arriba se mantienen si no hay GO)
-- Re-declaramos para asegurar visibilidad en este bloque
SET @SplitConsumoInternal = 0; -- <-- MODIFICA AQUÍ TAMBIÉN SI ES NECESARIO

DECLARE @Imp_Id INT, @Imp_CodRef VARCHAR(50), @Imp_Cant DECIMAL(10,2), @Imp_Fec DATE, @Imp_Des VARCHAR(255);
DECLARE cur_fifo CURSOR FOR 
    SELECT ImportId, CodRef, Cantidad, Fecha, Descripcion FROM #TmpImportacion ORDER BY ImportId;
OPEN cur_fifo;
FETCH NEXT FROM cur_fifo INTO @Imp_Id, @Imp_CodRef, @Imp_Cant, @Imp_Fec, @Imp_Des;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Emp_ID_Int INT;
    SELECT @Emp_ID_Int = EmpleadoId FROM Empleados WHERE CodRef = @Imp_CodRef;
    
    -- OPCIÓN A: FRAGMENTACIÓN (SPLIT)
    IF @SplitConsumoInternal = 1
    BEGIN
        WHILE @Imp_Cant > 0
        BEGIN
            DECLARE @Target_SID_A INT = NULL;
            DECLARE @Cap_Res_A DECIMAL(10,2) = 0;
            
            SELECT TOP 1 @Target_SID_A = s.SaldoId, @Cap_Res_A = s.Restante
            FROM #SaldosDisponibles s
            JOIN VacacionesSaldos vs ON s.SaldoId = vs.SaldoId
            WHERE s.EmpleadoId = @Emp_ID_Int AND s.Restante > 0
            ORDER BY vs.Anio ASC;

            IF @Target_SID_A IS NULL 
            BEGIN
                 SELECT TOP 1 @Target_SID_A = s.SaldoId, @Cap_Res_A = 9999
                 FROM #SaldosDisponibles s
                 JOIN VacacionesSaldos vs ON s.SaldoId = vs.SaldoId
                 WHERE s.EmpleadoId = @Emp_ID_Int
                 ORDER BY vs.Anio DESC;
            END

            IF @Target_SID_A IS NULL BREAK;

            DECLARE @Dias_Work_A DECIMAL(10,2) = CASE WHEN @Imp_Cant <= @Cap_Res_A THEN @Imp_Cant ELSE @Cap_Res_A END;
            
            INSERT INTO VacacionesSaldosDetalle (SaldoId, Fecha, Dias, Descripcion, Tipo)
            VALUES (@Target_SID_A, @Imp_Fec, @Dias_Work_A, @Imp_Des, 'Saldos Iniciales');
            
            UPDATE #SaldosDisponibles SET Restante = Restante - @Dias_Work_A WHERE SaldoId = @Target_SID_A;
            SET @Imp_Cant = @Imp_Cant - @Dias_Work_A;
        END
    END
    -- OPCIÓN B: SIN FRAGMENTACIÓN (APLICAR COMPLETO AL AÑO MÁS ANTIGUO CON SALDO)
    ELSE
    BEGIN
        DECLARE @Target_SID_B INT = NULL;
        
        -- Buscamos el año más antiguo que aún tenga algo de saldo (Restante > 0)
        SELECT TOP 1 @Target_SID_B = s.SaldoId
        FROM #SaldosDisponibles s
        JOIN VacacionesSaldos vs ON s.SaldoId = vs.SaldoId
        WHERE s.EmpleadoId = @Emp_ID_Int AND s.Restante > 0
        ORDER BY vs.Anio ASC;

        -- Si no hay ninguno con saldo positivo, a la última bolsa
        IF @Target_SID_B IS NULL
        BEGIN
             SELECT TOP 1 @Target_SID_B = s.SaldoId
             FROM #SaldosDisponibles s
             JOIN VacacionesSaldos vs ON s.SaldoId = vs.SaldoId
             WHERE s.EmpleadoId = @Emp_ID_Int
             ORDER BY vs.Anio DESC;
        END

        IF @Target_SID_B IS NOT NULL
        BEGIN
            INSERT INTO VacacionesSaldosDetalle (SaldoId, Fecha, Dias, Descripcion, Tipo)
            VALUES (@Target_SID_B, @Imp_Fec, @Imp_Cant, @Imp_Des, 'Saldos Iniciales');
            
            UPDATE #SaldosDisponibles SET Restante = Restante - @Imp_Cant WHERE SaldoId = @Target_SID_B;
        END
    END

    FETCH NEXT FROM cur_fifo INTO @Imp_Id, @Imp_CodRef, @Imp_Cant, @Imp_Fec, @Imp_Des;
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
PRINT 'Importación FIFO desde BMSJS completada exitosamente.';
GO
