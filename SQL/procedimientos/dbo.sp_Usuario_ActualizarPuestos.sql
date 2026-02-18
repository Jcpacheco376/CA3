IF OBJECT_ID('dbo.sp_Usuario_ActualizarPuestos') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_ActualizarPuestos;
GO
/* --- 6. SP para ACTUALIZAR Permisos de Puestos (Nuevo) --- */
CREATE PROCEDURE [dbo].[sp_Usuario_ActualizarPuestos]
    @UsuarioId INT,
    @PuestosJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId;
    INSERT INTO dbo.UsuariosPuestos (UsuarioId, PuestoId)
    SELECT @UsuarioId, PuestoId
    FROM OPENJSON(@PuestosJSON) WITH (PuestoId INT '$.PuestoId'); 
END

