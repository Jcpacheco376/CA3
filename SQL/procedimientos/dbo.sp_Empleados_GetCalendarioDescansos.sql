-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetCalendarioDescansos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetCalendarioDescansos]
    @EmpleadoId  INT,
    @FechaInicio DATE,
    @FechaFin    DATE
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Fecha, TipoDia, OrigenHorario
    FROM dbo.fn_Empleados_GetCalendarioDias(@EmpleadoId, @FechaInicio, @FechaFin)
    WHERE TipoDia <> 'LABORAL'
    ORDER BY Fecha;
END
GO