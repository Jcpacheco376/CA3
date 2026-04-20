-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Rol_AsignarPermiso]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Rol_AsignarPermiso
    @RoleId INT,
    @PermisoId INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM RolesPermisos WHERE RoleId = @RoleId AND PermisoId = @PermisoId)
    BEGIN
        INSERT INTO RolesPermisos (RoleId, PermisoId)
        VALUES (@RoleId, @PermisoId);
    END
END
GO