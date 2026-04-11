-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Permisos_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Permisos_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT PermisoId, NombrePermiso, Descripcion FROM SISPermisos WHERE ACTIVO=1;
END
GO