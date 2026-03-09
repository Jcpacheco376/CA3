-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_Delete]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
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