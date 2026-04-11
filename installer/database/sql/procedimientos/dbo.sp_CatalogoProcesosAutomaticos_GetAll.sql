CREATE PROCEDURE [dbo].[sp_CatalogoProcesosAutomaticos_GetAll]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        ProcesoId,
        Nombre,
        KeyInterna,
        Descripcion,
        CronExpression,
        Activo,
        UltimaEjecucion,
        UltimoEstatus
    FROM 
        dbo.CatalogoProcesosAutomaticos
    ORDER BY Nombre ASC;
END
GO
