-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Permisos_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Permisos_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT PermisoId, NombrePermiso, Descripcion FROM SISPermisos WHERE ACTIVO=1;
END
GO