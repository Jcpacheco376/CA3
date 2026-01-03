IF OBJECT_ID('dbo.X_sp_Departamentos_GetAll') IS NOT NULL      DROP PROCEDURE dbo.X_sp_Departamentos_GetAll;
GO
CREATE PROCEDURE sp_Departamentos_GetAll
AS
BEGIN
    -- Usamos OPENQUERY para ejecutar una consulta en el servidor vinculado. Es más eficiente.
    SELECT departamento, nombre, abreviatura, status
    FROM OPENQUERY([192.168.0.141,9000], 'SELECT departamento, nombre, abreviatura, status FROM bmsjs.dbo.departamentos');
END

