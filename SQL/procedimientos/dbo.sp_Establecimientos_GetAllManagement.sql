IF OBJECT_ID('dbo.sp_Establecimientos_GetAllManagement') IS NOT NULL      DROP PROCEDURE dbo.sp_Establecimientos_GetAllManagement;
GO
CREATE PROCEDURE [dbo].[sp_Establecimientos_GetAllManagement]
AS
BEGIN
    SET NOCOUNT ON;
    -- Seleccionamos todos los campos necesarios para la página de gestión
    SELECT 
        EstablecimientoId,
        CodRef,
        Nombre,
        Abreviatura,
        Activo
    FROM 
        dbo.CatalogoEstablecimientos
    ORDER BY 
        Nombre;
END
