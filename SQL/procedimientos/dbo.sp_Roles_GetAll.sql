IF OBJECT_ID('dbo.sp_Roles_GetAll') IS NOT NULL      DROP PROCEDURE dbo.sp_Roles_GetAll;
GO
CREATE PROCEDURE sp_Roles_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        r.RoleId,
        r.NombreRol,
        r.Descripcion,
        (
            SELECT 
                p.PermisoId, 
                p.NombrePermiso, 
                p.Descripcion -- <-- LA LÍNEA QUE FALTABA
            FROM Permisos p
            INNER JOIN RolesPermisos rp ON p.PermisoId = rp.PermisoId
            WHERE rp.RoleId = r.RoleId
			and p.activo= 1
            FOR JSON PATH
        ) AS Permisos
    FROM Roles r;
END


