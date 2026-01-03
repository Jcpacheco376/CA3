IF OBJECT_ID('dbo.sp_Usuario_ActualizarPreferencias') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_ActualizarPreferencias;
GO
-- Crea un nuevo procedimiento almacenado para actualizar las preferencias de un usuario específico.
CREATE PROCEDURE [dbo].[sp_Usuario_ActualizarPreferencias]
    @UsuarioId INT,
    @Theme NVARCHAR(50),
    @AnimationsEnabled BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Usuarios
    SET 
        Theme = @Theme,
        AnimationsEnabled = @AnimationsEnabled
    WHERE 
        UsuarioId = @UsuarioId;
END

