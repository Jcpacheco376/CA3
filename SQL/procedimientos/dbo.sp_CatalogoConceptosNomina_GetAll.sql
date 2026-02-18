IF OBJECT_ID('dbo.sp_CatalogoConceptosNomina_GetAll') IS NOT NULL      DROP PROCEDURE dbo.sp_CatalogoConceptosNomina_GetAll;
GO

CREATE PROCEDURE [dbo].[sp_CatalogoConceptosNomina_GetAll]
AS
BEGIN
    SELECT ConceptoId, Nombre,Abreviatura, CodRef, Activo 
    FROM CatalogoConceptosNomina 
    WHERE Activo = 1 
    ORDER BY Nombre;
END

