-- ────────────────────────────────────────────────────────────────────────────
-- Script: Importación Masiva de Vacaciones (FIFO - Estructurado)
-- Sistema: CA3 Control de Asistencia
-- ────────────────────────────────────────────────────────────────────────────

SET NOCOUNT ON;
GO

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

-- ─── 1. DECLARACIONES Y TABLAS TEMPORALES (AL INICIO) ────────────────────────
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

DECLARE @EmpId INT, @FechaIngreso DATE;
DECLARE @CurrentAnio INT;
DECLARE @GeneratedSaldoId INT;
DECLARE @Inicio DATE, @Fin DATE;

DECLARE @ImportId INT, @ImpCodRef VARCHAR(50), @ImpCantidad DECIMAL(10,2), @ImpFecha DATE, @ImpDesc VARCHAR(255);
DECLARE @CalculatedEmpId INT;
DECLARE @TargetSaldoId INT, @CapacidadRestante DECIMAL(10,2);
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
WHERE m.concepto_nomina = '08' 
  AND n.status = 'v' 
  AND e.status_empleado = '1'
ORDER BY n.fecha ASC;
GO

-- ─── 3. GENERACIÓN DE BOLSAS DE SALDO (SHELL) ───────────────────────────────
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
        
        INSERT INTO VacacionesSaldos (EmpleadoId, Anio, DiasOtorgados, DiasDisfrutados, FechaInicioPeriodo, FechaFinPeriodo)
        VALUES (@EmpId_Loop, @Anio_Indice, dbo.fn_Vacaciones_GetDiasOtorgados(@F_Fin, @Anio_Indice), 0, @F_Inicio, @F_Fin);

        DECLARE @NewSaldoId INT = SCOPE_IDENTITY();
        INSERT INTO #SaldosDisponibles (SaldoId, EmpleadoId, Restante)
        VALUES (@NewSaldoId, @EmpId_Loop, dbo.fn_Vacaciones_GetDiasOtorgados(@F_Fin, @Anio_Indice));

        SET @Anio_Indice = @Anio_Indice + 1;
    END
    FETCH NEXT FROM cur_emps INTO @EmpId_Loop, @FI_Loop;
END
CLOSE cur_emps;
DEALLOCATE cur_emps;
GO

-- ─── 4. PROCESAMIENTO FIFO (CONSUMO DE SALDOS) ──────────────────────────────
DECLARE @Imp_Id INT, @Imp_CodRef VARCHAR(50), @Imp_Cant DECIMAL(10,2), @Imp_Fec DATE, @Imp_Des VARCHAR(255);
DECLARE cur_fifo CURSOR FOR 
    SELECT ImportId, CodRef, Cantidad, Fecha, Descripcion FROM #TmpImportacion ORDER BY ImportId;

OPEN cur_fifo;
FETCH NEXT FROM cur_fifo INTO @Imp_Id, @Imp_CodRef, @Imp_Cant, @Imp_Fec, @Imp_Des;

WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Emp_ID_Int INT;
    SELECT @Emp_ID_Int = EmpleadoId FROM Empleados WHERE CodRef = @Imp_CodRef;

    WHILE @Imp_Cant > 0
    BEGIN
        DECLARE @Target_SID INT = NULL;
        DECLARE @Cap_Res DECIMAL(10,2) = 0;

        SELECT TOP 1 @Target_SID = s.SaldoId, @Cap_Res = s.Restante
        FROM #SaldosDisponibles s
        JOIN VacacionesSaldos vs ON s.SaldoId = vs.SaldoId
        WHERE s.EmpleadoId = @Emp_ID_Int AND s.Restante > 0
        ORDER BY vs.Anio ASC;

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
        VALUES (@Target_SID, @Imp_Fec, @Dias_Work, @Imp_Des, 'Saldos Iniciales');

        UPDATE #SaldosDisponibles SET Restante = Restante - @Dias_Work WHERE SaldoId = @Target_SID;
        SET @Imp_Cant = @Imp_Cant - @Dias_Work;
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

-- ─── 6. LIMPIEZA FINAL ──────────────────────────────────────────────────────
IF OBJECT_ID('tempdb..#TmpImportacion') IS NOT NULL DROP TABLE #TmpImportacion;
IF OBJECT_ID('tempdb..#SaldosDisponibles') IS NOT NULL DROP TABLE #SaldosDisponibles;
PRINT 'Importación FIFO completada exitosamente.';
GO
