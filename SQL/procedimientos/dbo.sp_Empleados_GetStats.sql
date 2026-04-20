-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetStats]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetStats]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        -- Total Active Employees
        (SELECT COUNT(1) FROM Empleados WHERE Activo = 1) as TotalActivos,
        
        (SELECT COUNT(1) FROM Empleados WHERE Activo = 1 AND HorarioIdPredeterminado IS NULL) as SinHorario,
        
        (SELECT COUNT(1) 
         FROM Empleados e 
         JOIN CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId 
         WHERE e.Activo = 1 AND h.EsRotativo = 1) as HorarioRotativo,
         
        (SELECT COUNT(1) 
         FROM Empleados e 
         WHERE e.Activo = 1 
         AND NOT EXISTS (SELECT 1 FROM EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId)) as SinDispositivo
END
GO