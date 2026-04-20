-- ─── IMPORTACIÓN DE VACACIONES DESDE ARCHIVOS CSV (vacaciones2026) ───────────────
-- ─── IMPORTACIÓN DE VACACIONES DESDE EXCEL CONTPAQi (CORREGIDO) ───────────────
-- Archivo origen: KárdexVacaciones_20260406_13_08_10_709.xlsx
-- Generado el: 14/4/2026, 7:57:50 a.m.

SET NOCOUNT ON;

-- ─── 0. LIMPIEZA INICIAL ────────────────────────────────────────────────────
IF CURSOR_STATUS('global','cur_emps') >= 0 BEGIN CLOSE cur_emps; DEALLOCATE cur_emps; END
IF CURSOR_STATUS('global','cur_fifo') >= 0 BEGIN CLOSE cur_fifo; DEALLOCATE cur_fifo; END
IF CURSOR_STATUS('global','cur_recalc') >= 0 BEGIN CLOSE cur_recalc; DEALLOCATE cur_recalc; END

IF OBJECT_ID('tempdb..#TmpImportacion') IS NOT NULL DROP TABLE #TmpImportacion;
IF OBJECT_ID('tempdb..#SaldosDisponibles') IS NOT NULL DROP TABLE #SaldosDisponibles;
PRINT 'Tablas temporales y cursores inicializados.';
GO

-- ─── 1. TABLAS TEMPORALES ───────────────────────────────────────────────────
CREATE TABLE #TmpImportacion (
    ImportId    INT IDENTITY(1,1),
    PIM         VARCHAR(50),
    Cantidad    DECIMAL(10,2),
    Fecha       DATE,
    Descripcion VARCHAR(255),
    Tipo        VARCHAR(50)
);

CREATE TABLE #SaldosDisponibles (
    SaldoId    INT PRIMARY KEY,
    EmpleadoId INT,
    Restante   DECIMAL(10,2)
);
GO

-- ─── 2. CARGA DE DATOS (GENERADOS DESDE CSV) ──────────
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('035', 1.0, GETDATE(), '18-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('035', 1.0, GETDATE(), '19-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('035', 18.0, GETDATE(), '16-OCT-04-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('035', 20.0, GETDATE(), '6', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 12.0, GETDATE(), '22', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 0.5, GETDATE(), 'ENE', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 2.5, GETDATE(), 'FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 1.5, GETDATE(), 'MAR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 7.0, GETDATE(), '21-MAR-01-ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 0.5, GETDATE(), '02-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 0.5, GETDATE(), 'JUN', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 3.0, GETDATE(), '7-8-10-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 1.0, GETDATE(), 'AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 0.5, GETDATE(), '30-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 0.5, GETDATE(), '18-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 17.5, GETDATE(), '16.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 14.0, GETDATE(), '22', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 3.0, GETDATE(), '12-13-23-ENE', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 1.0, GETDATE(), '18-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 1.0, GETDATE(), '28-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 1.0, GETDATE(), '08-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 8.0, GETDATE(), '01-09-SEP', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 1.0, GETDATE(), '11-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 15.0, GETDATE(), '21', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 2.0, GETDATE(), '10-11 ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 6.0, GETDATE(), '17-22-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 8.0, GETDATE(), '14', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 9.0, GETDATE(), '22', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 0.5, GETDATE(), '16-feb', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 0.5, GETDATE(), '31-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 1.0, GETDATE(), '01-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 1.0, GETDATE(), '17-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 7.0, GETDATE(), '29-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 10.0, GETDATE(), '21', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 18.0, GETDATE(), '1-19-AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 1.5, GETDATE(), '7-08-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 19.5, GETDATE(), '2.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 0.5, GETDATE(), '19-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 1.0, GETDATE(), '11-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 7.0, GETDATE(), '26-AGO-02-SEP', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 1.0, GETDATE(), '30-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 2.5, GETDATE(), '09-11-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 12.0, GETDATE(), '0', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 13.0, GETDATE(), '22', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 6.0, GETDATE(), '03-08-ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 6.0, GETDATE(), '03/08-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 1.0, GETDATE(), '25-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 1.0, GETDATE(), '17-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 1.0, GETDATE(), '30-NOV-PAGADO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 15.0, GETDATE(), '20', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 12.0, GETDATE(), '20', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 3.0, GETDATE(), '19-20-23-ENE', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 1.0, GETDATE(), '13-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 1.0, GETDATE(), '25-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 0.5, GETDATE(), '18-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 2.5, GETDATE(), '22-25-SEP', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 3.0, GETDATE(), '23-25-SEP', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 1.0, GETDATE(), 'SE PAGO 30-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 12.0, GETDATE(), '20', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 5.0, GETDATE(), '07-11-FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 1.0, GETDATE(), '27-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 0.5, GETDATE(), '10-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 0.5, GETDATE(), '01-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 7.0, GETDATE(), '02-09-SEP', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 1.0, GETDATE(), '28-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 15.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 0.5, GETDATE(), '24-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 0.5, GETDATE(), '14-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 6.0, GETDATE(), '24-29-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 1.0, GETDATE(), '19-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 0.5, GETDATE(), '12-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 8.5, GETDATE(), '3.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '18-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '15-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '05-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '20-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 4.0, GETDATE(), '02-17-18-19-AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '27-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 9.0, GETDATE(), '3', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1738', 2.0, GETDATE(), '24-25-AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1738', 2.0, GETDATE(), '10', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 1.0, GETDATE(), '11-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 6.0, GETDATE(), '29-MAY-03-JUN', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 7.0, GETDATE(), '5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('058', 14.0, GETDATE(), '22', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('058', 8.0, GETDATE(), '10-18-FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('058', 6.0, GETDATE(), '10-15-ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('058', 1.0, GETDATE(), '15-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('058', 9.0, GETDATE(), '07-16-AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('058', 24.0, GETDATE(), '12', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('500', 16.0, GETDATE(), '15-MAR-PAGARON', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('500', 16.0, GETDATE(), '0', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1223', 12.0, GETDATE(), '31-ENE-PAGARON', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1223', 12.0, GETDATE(), '0', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 3.0, GETDATE(), '21-23-MAR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 7.0, GETDATE(), '01-08-ABRI', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 4.0, GETDATE(), '24-27-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 14.0, GETDATE(), '0', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('887', 6.0, GETDATE(), '03-08-ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('887', 6.0, GETDATE(), '8', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 1.0, GETDATE(), '22-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 6.0, GETDATE(), '23-29-MAY', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 1.0, GETDATE(), '14-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 1.0, GETDATE(), '02-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 9.0, GETDATE(), '5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1619', 12.0, GETDATE(), '15-SEP-PAGARON', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1619', 12.0, GETDATE(), '0', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('177', 1.0, GETDATE(), '20-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('177', 1.0, GETDATE(), '21', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 2.0, GETDATE(), '09-28-MAR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 2.0, GETDATE(), '05-26-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.5, GETDATE(), '24-28-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.0, GETDATE(), '11-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.0, GETDATE(), '20-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.0, GETDATE(), '06-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 8.5, GETDATE(), '3.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 4.0, GETDATE(), '14-17-ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 1.0, GETDATE(), '20-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 1.0, GETDATE(), '17-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 9.0, GETDATE(), '15-25-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 0.5, GETDATE(), '18-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 15.5, GETDATE(), '2.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 1.5, GETDATE(), '26-27-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 5.0, GETDATE(), '13-19-SEP', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 2.0, GETDATE(), '28-29-SEP', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 8.5, GETDATE(), '9.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('910', 1.0, GETDATE(), '23-feb', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('910', 1.0, GETDATE(), '06-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('910', 0.5, GETDATE(), '29-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('910', 6.0, GETDATE(), '18-25-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('910', 8.5, GETDATE(), '5.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1456', 1.0, GETDATE(), '06-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1456', 1.0, GETDATE(), '09-10-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1456', 2.0, GETDATE(), '10', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1737', 1.0, GETDATE(), '11-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1737', 1.0, GETDATE(), '11', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 1.0, GETDATE(), '09-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 1.0, GETDATE(), '18-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 1.0, GETDATE(), '18-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 3.0, GETDATE(), '9', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 0.5, GETDATE(), 'JUN', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 3.0, GETDATE(), '7-8-10-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 1.5, GETDATE(), '03-ago-30-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 0.5, GETDATE(), '18-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 16.5, GETDATE(), '30-17 FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 2.0, GETDATE(), '10-30-ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 13.0, GETDATE(), '13-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 3.0, GETDATE(), '09-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 1.0, GETDATE(), '11-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 0.5, GETDATE(), '27-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 5.0, GETDATE(), '06-10-FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 1.0, GETDATE(), '07-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 1.0, GETDATE(), '25-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 9.0, GETDATE(), '23-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 1.5, GETDATE(), '22-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 3.0, GETDATE(), '21-DIC-PAGADOS', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 1.0, GETDATE(), '01-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 1.0, GETDATE(), '23-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 1.0, GETDATE(), '24-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 6.0, GETDATE(), '22 AL 27 JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 1.0, GETDATE(), '31-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 12.0, GETDATE(), '14-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 1.0, GETDATE(), '29-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 1.5, GETDATE(), '29-30-DIC', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 1.0, GETDATE(), '02-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 0.5, GETDATE(), '05-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 1.0, GETDATE(), '27-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 0.5, GETDATE(), '21-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 1.5, GETDATE(), '05-06-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 7.5, GETDATE(), '02-AL 10 AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 18.0, GETDATE(), '1-19-AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 2.0, GETDATE(), '7-08-21-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 0.5, GETDATE(), '21-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 0.5, GETDATE(), '24-ene', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 0.5, GETDATE(), '26-ene', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 0.5, GETDATE(), '06-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 1.0, GETDATE(), '29-JUN-05-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 18.0, GETDATE(), '02-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 0.5, GETDATE(), '03-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 6.0, GETDATE(), '29 AL 03 AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 0.5, GETDATE(), '24-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 7.0, GETDATE(), '11-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 1.0, GETDATE(), '17-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 1.0, GETDATE(), '14-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 1.0, GETDATE(), '04-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 1.0, GETDATE(), '03-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 8.0, GETDATE(), '19-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 10.0, GETDATE(), 'PAGADOS', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 1.0, GETDATE(), '03-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 5.0, GETDATE(), '01 AL 05 ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 1.0, GETDATE(), '24-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 7.0, GETDATE(), '07 AL 14 OCT', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 7.0, GETDATE(), '15-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 0.5, GETDATE(), '27-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 6.0, GETDATE(), '19 AL 25 MAR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 1.0, GETDATE(), '10-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 11.0, GETDATE(), '28-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 1.0, GETDATE(), '15-ene', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 0.5, GETDATE(), '25-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 1.0, GETDATE(), '16-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 7.0, GETDATE(), '07-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 0.5, GETDATE(), '26-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '05-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '27-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '17-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 4.0, GETDATE(), '19-22-JUN', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 3.0, GETDATE(), '12-13-15-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '31-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '26-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 1.0, GETDATE(), '26-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2299', 1.0, GETDATE(), '31-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2299', 1.0, GETDATE(), '01-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2299', 1.0, GETDATE(), '02-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 1.0, GETDATE(), '20-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 1.0, GETDATE(), '17-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 1.0, GETDATE(), '09-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 1.0, GETDATE(), '24-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 1.0, GETDATE(), '04-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 1.0, GETDATE(), '06-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 1.0, GETDATE(), '07-ene', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 2.0, GETDATE(), '21-22-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 1.0, GETDATE(), '18-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 1.0, GETDATE(), '08-feb', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 1.0, GETDATE(), '30-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 2.0, GETDATE(), '18-30-MAY', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 5.0, GETDATE(), '30-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 1.0, GETDATE(), '14-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 13.0, GETDATE(), 'PAGARON', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('500', 4.0, GETDATE(), '15 AL 19 MAR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1223', 14.0, GETDATE(), 'VACACIONES PAGADAS 31-ENE-2024', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 1.0, GETDATE(), '17-ene', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 1.0, GETDATE(), '25-ene', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 1.0, GETDATE(), '30-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 2.0, GETDATE(), '11-13-MAY', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 1.0, GETDATE(), '15-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 7.0, GETDATE(), '03 al 10 AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 1.0, GETDATE(), '05-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 1.0, GETDATE(), '03-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('887', 12.0, GETDATE(), '15 AL 27 JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 2.0, GETDATE(), '13-25-MAR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 3.0, GETDATE(), '03-09-23-ABR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 3.0, GETDATE(), '06-17-25-MAY', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 1.0, GETDATE(), '11-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 3.0, GETDATE(), '09-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 1.0, GETDATE(), '18-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 0.5, GETDATE(), '19-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 1.0, GETDATE(), '07-ene', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1754', 1.0, GETDATE(), '27-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1754', 2.0, GETDATE(), '02-03-ENE-2024', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1754', 2.0, GETDATE(), '10-12-FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1754', 1.0, GETDATE(), '01-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1620', 5.0, GETDATE(), '29-E-AL-02-FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1704', 3.0, GETDATE(), '25-29-30-NOV', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1704', 1.0, GETDATE(), '11-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1704', 2.0, GETDATE(), '07-14-FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1704', 1.0, GETDATE(), '06-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1704', 1.0, GETDATE(), '09-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1704', 1.0, GETDATE(), '14-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2084', 1.0, GETDATE(), '31-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2084', 1.0, GETDATE(), '12-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2084', 1.0, GETDATE(), '30-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2084', 1.0, GETDATE(), '19-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2108', 1.0, GETDATE(), '19-sep', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2108', 1.0, GETDATE(), '27-dic', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2108', 2.0, GETDATE(), '30-31-DIC', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('177', 6.0, GETDATE(), '22 AL 27 JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1822', 6.0, GETDATE(), '19-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.0, GETDATE(), '22-feb', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 2.0, GETDATE(), '13-22-MAR', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 2.0, GETDATE(), '17-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.0, GETDATE(), '07-may', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.0, GETDATE(), '02-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 3.0, GETDATE(), '26-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.0, GETDATE(), '18-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 1.0, GETDATE(), '13-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 1.0, GETDATE(), '04-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 0.5, GETDATE(), '21-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 1.0, GETDATE(), '20-abr', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 1.0, GETDATE(), '12-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 8.0, GETDATE(), '05 AL 13 JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 3.0, GETDATE(), '22-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 2.0, GETDATE(), '15-23-OCT', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('234', 0.5, GETDATE(), '21-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 0.5, GETDATE(), '01-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 0.5, GETDATE(), '04-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 0.5, GETDATE(), '05-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 0.5, GETDATE(), '01-jul', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 15.0, GETDATE(), '26 AL 12 AGO', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 2.0, GETDATE(), '19-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 2.0, GETDATE(), '09-JUN-18-JUL', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 1.0, GETDATE(), '18-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 1.0, GETDATE(), '12-ene', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 3.0, GETDATE(), '16 AL 19 FEB', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 1.0, GETDATE(), '22-mar', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 1.5, GETDATE(), '02-25-MAY', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 2.0, GETDATE(), '02-15-OCT', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 0.5, GETDATE(), '11-nov', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2129', 1.0, GETDATE(), '12-jun', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2129', 1.0, GETDATE(), '26-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2129', 1.0, GETDATE(), '30-oct', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('697', 12.0, GETDATE(), '16-ago', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('035', 26.0, GETDATE(), '3', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 24.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('150', 22.0, GETDATE(), '0.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 24.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 12.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('178', 22.0, GETDATE(), '18', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 16.0, GETDATE(), '0.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('180', 22.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('216', 22.0, GETDATE(), '0.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 20.0, GETDATE(), '12', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('125', 12.0, GETDATE(), 'Vacaciones 2025', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1345', 16.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 16.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2289', 12.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1352', 16.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1621', 16.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2345', 12.0, GETDATE(), '0.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('500', 20.0, GETDATE(), '20', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1223', 16.0, GETDATE(), '16', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 18.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 18.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1619', 16.0, GETDATE(), '3', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1620', 16.0, GETDATE(), '5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2084', 14.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2278', 12.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2388', 12.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('144', 12.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1822', 14.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2365', 12.0, GETDATE(), '12', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 16.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 22.0, GETDATE(), '4', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1766', 14.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2267', 12.0, GETDATE(), '9', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2407', 12.0, GETDATE(), 'Vacaciones 2025', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2418', 12.0, GETDATE(), 'Vacaciones 2025', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('013', 24.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('697', 20.0, GETDATE(), 'Vacaciones 2025', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('035', 28.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('037', 24.0, GETDATE(), '0.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('056', 24.0, GETDATE(), '4', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1502', 18.0, GETDATE(), '3', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('365', 22.0, GETDATE(), '13', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2533', 12.0, GETDATE(), 'Vacaciones 2026', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1320', 18.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2289', 14.0, GETDATE(), '2', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2507', 12.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('500', 22.0, GETDATE(), 'Vacaciones 2026', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('877', 20.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('898', 20.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1822', 16.0, GETDATE(), 'Vacaciones 2026', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2365', 14.0, GETDATE(), 'Vacaciones 2026', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1660', 12.0, GETDATE(), 'Vacaciones 2026', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('1260', 18.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('226', 22.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2267', 14.0, GETDATE(), '0.5', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2518', 12.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('013', 24.0, GETDATE(), 'Vacaciones 2026', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('2442', 12.0, GETDATE(), '1', 'Saldos Iniciales');
INSERT INTO #TmpImportacion (PIM, Cantidad, Fecha, Descripcion, Tipo) VALUES ('122', 24.0, GETDATE(), '1', 'Saldos Iniciales');
GO

-- ─── 2.1 LIMPIEZA ESPECÍFICA DE EMPLEADOS ───────────────────────────────────
-- Eliminamos saldos y detalles existentes SOLO para los empleados en esta importación
DECLARE @RowsDeletedDetalle INT, @RowsDeletedCabecero INT;

DELETE FROM VacacionesSaldosDetalle 
WHERE SaldoId IN (
    SELECT SaldoId FROM VacacionesSaldos 
    WHERE EmpleadoId IN (SELECT e.EmpleadoId FROM #TmpImportacion t JOIN Empleados e ON e.Pim = t.PIM)
);
SET @RowsDeletedDetalle = @@ROWCOUNT;

DELETE FROM VacacionesSaldos 
WHERE EmpleadoId IN (SELECT e.EmpleadoId FROM #TmpImportacion t JOIN Empleados e ON e.Pim = t.PIM);
SET @RowsDeletedCabecero = @@ROWCOUNT;

PRINT 'Limpieza completada: ' + CAST(@RowsDeletedCabecero AS VARCHAR) + ' cabeceros y ' + CAST(@RowsDeletedDetalle AS VARCHAR) + ' detalles eliminados.';
GO

-- ─── 3. GENERACIÓN DE BOLSAS DE SALDO (EXTENDIDO) ───────────────────────────
PRINT 'Iniciando generación de bolsas de saldo por empleado...';
DECLARE @EmpId_Loop INT, @FI_Loop DATE, @Nombre_Loop VARCHAR(150);
DECLARE cur_emps CURSOR FOR 
    SELECT DISTINCT e.EmpleadoId, e.FechaIngreso, e.NombreCompleto
    FROM #TmpImportacion t
    JOIN Empleados e ON e.pim = t.PIM;
OPEN cur_emps;
FETCH NEXT FROM cur_emps INTO @EmpId_Loop, @FI_Loop, @Nombre_Loop;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Anio_Indice INT = 1;
    DECLARE @BagsCreated INT = 0;
    -- Generamos hasta la fecha actual para evitar crear bolsas a futuro que sp_Vacaciones_Recalcular borrará
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
        SET @BagsCreated = @BagsCreated + 1;
    END
    PRINT '  - Empleado: ' + @Nombre_Loop + ' (' + CAST(@BagsCreated AS VARCHAR) + ' bolsas creadas)';
    FETCH NEXT FROM cur_emps INTO @EmpId_Loop, @FI_Loop, @Nombre_Loop;
END
CLOSE cur_emps;
DEALLOCATE cur_emps;
GO

-- ─── 4. PROCESAMIENTO FIFO (CONSUMO DE SALDOS) ──────────────────────────────
PRINT 'Iniciando procesamiento FIFO de los consumos...';
DECLARE @Imp_Id INT, @Imp_PIM VARCHAR(50), @Imp_Cant DECIMAL(10,2), @Imp_Fec DATE, @Imp_Des VARCHAR(255), @Imp_Tipo VARCHAR(50);
DECLARE cur_fifo CURSOR FOR 
    SELECT ImportId, PIM, Cantidad, Fecha, Descripcion, Tipo FROM #TmpImportacion ORDER BY ImportId;
OPEN cur_fifo;
FETCH NEXT FROM cur_fifo INTO @Imp_Id, @Imp_PIM, @Imp_Cant, @Imp_Fec, @Imp_Des, @Imp_Tipo;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Emp_ID_Int INT, @Nombre_FIFO VARCHAR(150);
    SELECT @Emp_ID_Int = EmpleadoId, @Nombre_FIFO = NombreCompleto FROM Empleados WHERE pim = @Imp_PIM;
    
    IF @Emp_ID_Int IS NULL
    BEGIN
        PRINT '[!] ERROR: Empleado con PIM ' + @Imp_PIM + ' no encontrado. Saltando registro.';
    END
    ELSE
    BEGIN
        DECLARE @Orig_Cant DECIMAL(10,2) = @Imp_Cant;
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
            VALUES (@Target_SID, @Imp_Fec, @Dias_Work, @Imp_Des, @Imp_Tipo);
            
            UPDATE #SaldosDisponibles SET Restante = Restante - @Dias_Work WHERE SaldoId = @Target_SID;
            SET @Imp_Cant = @Imp_Cant - @Dias_Work;
        END
        -- PRINT '  - Consumo aplicado: ' + @Nombre_FIFO + ' (' + CAST(@Orig_Cant AS VARCHAR) + ' días)';
    END
    FETCH NEXT FROM cur_fifo INTO @Imp_Id, @Imp_PIM, @Imp_Cant, @Imp_Fec, @Imp_Des, @Imp_Tipo;
END
CLOSE cur_fifo;
DEALLOCATE cur_fifo;
GO

-- ─── 5. RECALCULO FINAL ─────────────────────────────────────────────────────
-- Esto asegura que los días disfrutados en VacacionesSaldos se actualicen
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
PRINT 'Importación FIFO corregida completada exitosamente.';
