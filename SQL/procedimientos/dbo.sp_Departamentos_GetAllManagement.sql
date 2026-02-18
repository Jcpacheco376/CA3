IF OBJECT_ID('dbo.sp_Departamentos_GetAllManagement') IS NOT NULL      DROP PROCEDURE dbo.sp_Departamentos_GetAllManagement;
GO
-- ------------------------------------------------------------------
-- sp_Departamentos_GetAllManagement (Sin cambios)
-- ------------------------------------------------------------------
CREATE PROCEDURE dbo.sp_Departamentos_GetAllManagement
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DepartamentoId, CodRef, Nombre, Abreviatura, Activo
    FROM dbo.CatalogoDepartamentos;
END

