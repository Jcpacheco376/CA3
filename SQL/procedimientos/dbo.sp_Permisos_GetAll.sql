-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Permisos_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Permisos_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT PermisoId, NombrePermiso, Descripcion FROM SISPermisos WHERE ACTIVO=1;
END
GO