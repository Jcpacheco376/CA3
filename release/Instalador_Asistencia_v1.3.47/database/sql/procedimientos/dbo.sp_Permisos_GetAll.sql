-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Permisos_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Permisos_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Permisos_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT PermisoId, NombrePermiso, Descripcion FROM SISPermisos WHERE ACTIVO=1;
END
GO