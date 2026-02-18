IF OBJECT_ID('dbo.sp_Usuarios_GetNextId') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuarios_GetNextId;
GO
-- =============================================
-- 1. NUEVO PROCEDIMIENTO PARA OBTENER EL SIGUIENTE ID
-- =============================================
-- Este procedimiento calcula el siguiente ID de usuario disponible
-- simplemente encontrando el máximo actual y sumándole 1.
CREATE PROCEDURE sp_Usuarios_GetNextId
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ISNULL(MAX(UsuarioId), 0) + 1 AS NextUsuarioId FROM dbo.Usuarios;
END

