-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ObtenerPermisos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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