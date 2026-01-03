IF OBJECT_ID('dbo.sp_Usuario_ActualizarPassword') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_ActualizarPassword;
GO


-- Modificar sp_Usuario_ActualizarPassword para desmarcar el cambio de contraseña.
-- Esto se usa cuando el propio usuario establece su nueva contraseña.
CREATE PROCEDURE [dbo].[sp_Usuario_ActualizarPassword]
    @UsuarioId INT,
    @NuevoPassword NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    IF @NuevoPassword IS NOT NULL AND @NuevoPassword != ''
    BEGIN
        UPDATE dbo.Usuarios
        SET 
            PasswordHash = PWDENCRYPT(@NuevoPassword),
            DebeCambiarPassword = 0 -- Desmarcar, ya que el usuario ha cumplido.
        WHERE UsuarioId = @UsuarioId;
    END
END

