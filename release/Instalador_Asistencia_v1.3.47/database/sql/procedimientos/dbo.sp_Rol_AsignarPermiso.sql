-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Rol_AsignarPermiso]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Rol_AsignarPermiso]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

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