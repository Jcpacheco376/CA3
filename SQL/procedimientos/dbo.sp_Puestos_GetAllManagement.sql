IF OBJECT_ID('dbo.sp_Puestos_GetAllManagement') IS NOT NULL      DROP PROCEDURE dbo.sp_Puestos_GetAllManagement;
GO
CREATE PROCEDURE [dbo].[sp_Puestos_GetAllManagement]
AS
BEGIN
    SET NOCOUNT ON;
    -- Seleccionamos todos los campos necesarios para la página de gestión
    SELECT 
        PuestoId,
        CodRef,
        Nombre,
        Activo
    FROM 
        dbo.CatalogoPuestos
    ORDER BY 
        Nombre;
END
