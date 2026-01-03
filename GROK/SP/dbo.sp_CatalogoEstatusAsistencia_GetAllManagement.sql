IF OBJECT_ID('dbo.sp_CatalogoEstatusAsistencia_GetAllManagement') IS NOT NULL      DROP PROCEDURE dbo.sp_CatalogoEstatusAsistencia_GetAllManagement;
GO
CREATE   PROCEDURE sp_CatalogoEstatusAsistencia_GetAllManagement
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.CatalogoEstatusAsistencia ORDER BY EstatusId;
END

