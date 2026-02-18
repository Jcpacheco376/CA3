IF OBJECT_ID('dbo.sp_Roles_UpdateTokenVersion') IS NOT NULL      DROP PROCEDURE dbo.sp_Roles_UpdateTokenVersion;
GO
CREATE  PROCEDURE [dbo].[sp_Roles_UpdateTokenVersion]
    @RoleId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Incrementa la versión del token para todos los usuarios que tienen este rol asignado.
    -- Esto invalidará sus tokens JWT actuales en la próxima petición.
    UPDATE u
    SET u.TokenVersion = u.TokenVersion + 1
    FROM dbo.Usuarios u
    JOIN dbo.UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId
    WHERE ur.RoleId = @RoleId;

    PRINT 'TokenVersion actualizado para usuarios del rol ' + CAST(@RoleId AS NVARCHAR);
END

