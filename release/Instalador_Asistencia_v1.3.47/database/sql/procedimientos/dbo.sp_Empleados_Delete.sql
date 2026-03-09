-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_Delete]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_Delete]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
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