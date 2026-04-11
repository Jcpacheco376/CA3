-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_Recalcular]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Vacaciones_Recalcular
    @EmpleadoId INT,
    @ReacomodarFIFO BIT = 0  -- 0: Solo suma (default), 1: Reasigna detalles de forma cronológica (FIFO)
AS
BEGIN
    SET NOCOUNT ON;
    -- =============================================================
    -- PASO 1: Determinar Fecha de Ingreso
    -- =============================================================
    DECLARE @FechaIngreso DATE;
    SELECT @FechaIngreso = FechaIngreso FROM Empleados WHERE EmpleadoId = @EmpleadoId;
    IF @FechaIngreso IS NULL
    BEGIN
        RAISERROR('Empleado no encontrado o sin fecha de ingreso.', 16, 1);
        RETURN;
    END
    -- =============================================================
    -- PASO 2: Borrar periodos futuros no iniciados
    -- =============================================================
    DELETE FROM VacacionesSaldos
    WHERE EmpleadoId = @EmpleadoId
      AND FechaInicioPeriodo > GETDATE();
    -- =============================================================
    -- PASO 3: Actualizar DiasOtorgados (Fuente de verdad: fn_Vacaciones_GetDiasOtorgados)
    -- =============================================================
    UPDATE vs
    SET vs.DiasOtorgados = dbo.fn_Vacaciones_GetDiasOtorgados(vs.FechaFinPeriodo, vs.Anio)
    FROM VacacionesSaldos vs
    WHERE vs.EmpleadoId = @EmpleadoId;
    -- =============================================================
    -- PASO 4: MODO REACOMODAR (FIFO) — Opcional
    --         Si se solicita, este paso re-asigna el SaldoId de cada
    --         movimiento para que consuman primero lo más viejo.
    -- =============================================================
    IF @ReacomodarFIFO = 1
    BEGIN
        -- Usamos una tabla temporal para controlar la disponibilidad de cada bolsa
        DECLARE @Saldos TABLE (SaldoId INT PRIMARY KEY, Anio INT, Capacidad DECIMAL(10,2), Usado DECIMAL(10,2) DEFAULT 0);
        INSERT INTO @Saldos (SaldoId, Anio, Capacidad)
        SELECT SaldoId, Anio, CAST(DiasOtorgados AS DECIMAL(10,2))
        FROM VacacionesSaldos WHERE EmpleadoId = @EmpleadoId ORDER BY Anio ASC;
        -- Cursor de movimientos por fecha (usamos JOIN con VacacionesSaldos para filtrar por EmpleadoId)
        DECLARE @DetId INT, @DiasMov DECIMAL(10,2);
        DECLARE cur_movs CURSOR FAST_FORWARD FOR 
            SELECT vd.DetalleId, vd.Dias 
            FROM VacacionesSaldosDetalle vd
            JOIN VacacionesSaldos vs ON vd.SaldoId = vs.SaldoId
            WHERE vs.EmpleadoId = @EmpleadoId 
              AND vd.Tipo IN ('Disfrutado', 'Ajuste', 'Pagado', 'Saldos Iniciales')
            ORDER BY vd.Fecha ASC, vd.DetalleId ASC;
        OPEN cur_movs;
        FETCH NEXT FROM cur_movs INTO @DetId, @DiasMov;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Buscar la bolsa más antigua que tenga espacio
            DECLARE @TargetSaldoId INT = (SELECT TOP 1 SaldoId FROM @Saldos WHERE (Capacidad - Usado) > 0 ORDER BY Anio ASC);
            -- Si no hay bolsas con espacio, asignamos a la última (más reciente) para que quede en saldo negativo
            IF @TargetSaldoId IS NULL SET @TargetSaldoId = (SELECT TOP 1 SaldoId FROM @Saldos ORDER BY Anio DESC);
            IF @TargetSaldoId IS NULL BREAK; -- No debería pasar si hay VacacionesSaldos
            -- Vinculamos el movimiento a esa bolsa
            UPDATE VacacionesSaldosDetalle SET SaldoId = @TargetSaldoId WHERE DetalleId = @DetId;
            -- Actualizamos nuestro control local de capacidad
            UPDATE @Saldos SET Usado = Usado + @DiasMov WHERE SaldoId = @TargetSaldoId;
            FETCH NEXT FROM cur_movs INTO @DetId, @DiasMov;
        END
        CLOSE cur_movs;
        DEALLOCATE cur_movs;
    END
    -- =============================================================
    -- PASO 5: Recalcular sumatorias (DiasDisfrutados)
    -- =============================================================
    UPDATE vs
    SET vs.DiasDisfrutados = ISNULL((
        SELECT SUM(vd.Dias)
        FROM VacacionesSaldosDetalle vd
        WHERE vd.SaldoId = vs.SaldoId
          AND vd.Tipo IN ('Disfrutado', 'Ajuste', 'Pagado', 'Saldos Iniciales')
    ), 0)
    FROM VacacionesSaldos vs
    WHERE vs.EmpleadoId = @EmpleadoId;
END
GO