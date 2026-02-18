IF OBJECT_ID('dbo.sp_Rol_AsignarPermiso') IS NOT NULL      DROP PROCEDURE dbo.sp_Rol_AsignarPermiso;
GO
CREATE PROCEDURE sp_Rol_AsignarPermiso
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

