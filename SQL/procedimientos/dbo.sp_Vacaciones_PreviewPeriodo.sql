-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_PreviewPeriodo]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_PreviewPeriodo]
-- Base de Datos:       CA
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────
-- Solo lectura. Consume fn_Empleados_GetCalendarioDias como fuente de verdad.
-- Devuelve el desglose del periodo para mostrar al usuario antes de guardar.
-- ──────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_Vacaciones_PreviewPeriodo]
    @EmpleadoId  INT,
    @FechaInicio DATE,
    @FechaFin    DATE
AS
BEGIN
    SET NOCOUNT ON;
    -- Primer recordset: detalle día a día (de la función fuente de verdad)
    SELECT Fecha, TipoDia
    FROM dbo.fn_Empleados_GetCalendarioDias(@EmpleadoId, @FechaInicio, @FechaFin)
    ORDER BY Fecha;
    -- Segundo recordset: resumen
    SELECT
        DATEDIFF(DAY, @FechaInicio, @FechaFin) + 1 AS DiasNaturales,
        (SELECT COUNT(*) FROM dbo.fn_Empleados_GetCalendarioDias(@EmpleadoId, @FechaInicio, @FechaFin) WHERE TipoDia = 'LABORAL')        AS DiasSolicitados,
        (SELECT COUNT(*) FROM dbo.fn_Empleados_GetCalendarioDias(@EmpleadoId, @FechaInicio, @FechaFin) WHERE TipoDia = 'DESCANSO')       AS DiasDescanso,
        (SELECT COUNT(*) FROM dbo.fn_Empleados_GetCalendarioDias(@EmpleadoId, @FechaInicio, @FechaFin) WHERE TipoDia = 'FERIADO')        AS DiasFeriados,
        (SELECT COUNT(*) FROM dbo.fn_Empleados_GetCalendarioDias(@EmpleadoId, @FechaInicio, @FechaFin) WHERE TipoDia = 'SIN_HORARIO')    AS DiasSinHorario,
        CASE WHEN (SELECT COUNT(*) FROM dbo.fn_Empleados_GetCalendarioDias(@EmpleadoId, @FechaInicio, @FechaFin) WHERE TipoDia = 'SIN_HORARIO') > 0 THEN 1 ELSE 0 END AS TieneDiasSinHorario,
        -- Detectar si hay traslape
        CASE WHEN EXISTS (
            SELECT 1 FROM SolicitudesVacaciones 
            WHERE EmpleadoId = @EmpleadoId 
              AND Estatus IN ('Pendiente', 'Aprobado', 'PendienteHorario')
              AND (
                (@FechaInicio BETWEEN FechaInicio AND FechaFin) OR
                (@FechaFin BETWEEN FechaInicio AND FechaFin) OR
                (FechaInicio BETWEEN @FechaInicio AND @FechaFin)
              )
        ) THEN 1 ELSE 0 END AS TieneTraslape,
        -- Detectar si es retroactivo
        CASE WHEN @FechaInicio < CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END AS EsRetroactivo;
END
GO