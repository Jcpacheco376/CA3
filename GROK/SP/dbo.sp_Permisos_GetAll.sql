IF OBJECT_ID('dbo.sp_Permisos_GetAll') IS NOT NULL      DROP PROCEDURE dbo.sp_Permisos_GetAll;
GO
CREATE PROCEDURE sp_Permisos_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT PermisoId, NombrePermiso, Descripcion FROM Permisos WHERE ACTIVO=1;
END


