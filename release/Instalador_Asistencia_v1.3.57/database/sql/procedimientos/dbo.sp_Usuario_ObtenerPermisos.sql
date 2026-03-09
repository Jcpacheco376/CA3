-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ObtenerPermisos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuario_ObtenerPermisos]
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DISTINCT 
        p.PermisoId,
        p.NombrePermiso,
        p.Descripcion
    FROM dbo.Usuarios u
    JOIN dbo.UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId
    JOIN dbo.Roles r ON ur.RoleId = r.RoleId
    JOIN dbo.RolesPermisos rp ON r.RoleId = rp.RoleId
    JOIN dbo.SISPermisos p ON rp.PermisoId = p.PermisoId
    WHERE u.UsuarioId = @UsuarioId
	AND P.ACTIVO= 1;
	
END
GO