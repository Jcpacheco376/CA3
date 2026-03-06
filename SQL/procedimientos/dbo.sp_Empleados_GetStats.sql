-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetStats]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetStats]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        -- Total Active Employees
        (SELECT COUNT(1) FROM Empleados WHERE Activo = 1) as TotalActivos,
        
        -- Missing Schedule (Active employees with NULL schedule)
        (SELECT COUNT(1) FROM Empleados WHERE Activo = 1 AND HorarioIdPredeterminado IS NULL) as SinHorario,
        
        -- Rotative Schedule (Active employees with Rotative schedule)
        (SELECT COUNT(1) 
         FROM Empleados e 
         JOIN CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId 
         WHERE e.Activo = 1 AND h.EsRotativo = 1) as HorarioRotativo,
         
        -- Missing Device (Active employees NOT assigned to any Zone)
        (SELECT COUNT(1) 
         FROM Empleados e 
         WHERE e.Activo = 1 
         AND NOT EXISTS (SELECT 1 FROM EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId)) as SinDispositivo
END
GO