IF OBJECT_ID('dbo.sp_GruposNomina_GetAllManagement') IS NOT NULL      DROP PROCEDURE dbo.sp_GruposNomina_GetAllManagement;
GO
-- --GO----------------------------------------------------------------
-- sp_GruposNomina_GetAllManagement (Sin cambios)
-- ------------------------------------------------------------------
CREATE PROCEDURE dbo.sp_GruposNomina_GetAllManagement
AS
BEGIN
    SET NOCOUNT ON;
    SELECT GrupoNominaId, CodRef, Nombre, Abreviatura, Activo
    FROM dbo.CatalogoGruposNomina;
END

