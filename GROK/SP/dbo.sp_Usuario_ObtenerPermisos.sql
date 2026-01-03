IF OBJECT_ID('dbo.sp_Usuario_ObtenerPermisos') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_ObtenerPermisos;
GO
CREATE  PROCEDURE [dbo].[sp_Usuario_ObtenerPermisos]
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
    JOIN dbo.Permisos p ON rp.PermisoId = p.PermisoId
    WHERE u.UsuarioId = @UsuarioId
	AND P.ACTIVO= 1;
	
END

