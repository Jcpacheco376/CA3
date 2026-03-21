-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_Delete]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE dbo.sp_Empleados_Delete
    @EmpleadoId int
AS
BEGIN
    SET NOCOUNT ON;

    -- Soft delete
    UPDATE dbo.Empleados
    SET Activo = 0
    WHERE EmpleadoId = @EmpleadoId;
END
GO