IF OBJECT_ID('dbo.sp_Usuario_ValidarLogin') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_ValidarLogin;
GO
-- Modifica el procedimiento de login para que acepte tanto UsuarioId como NombreUsuario
CREATE PROCEDURE [dbo].[sp_Usuario_ValidarLogin]
    @Identificador NVARCHAR(50),
    @Password NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @UsuarioId INT;
    DECLARE @PasswordHashCorrecto VARBINARY(MAX);

    SELECT
        @UsuarioId = UsuarioId,
        @PasswordHashCorrecto = PasswordHash
    FROM dbo.Usuarios
    WHERE (NombreUsuario = @Identificador OR CAST(UsuarioId AS NVARCHAR(50)) = @Identificador) 
      AND EstaActivo = 1;

    IF @UsuarioId IS NOT NULL AND PWDCOMPARE(@Password, @PasswordHashCorrecto) = 1
    BEGIN
        SELECT 
            UsuarioId, NombreUsuario, NombreCompleto, Email,
            ISNULL(Theme, 'indigo') AS Theme,
            ISNULL(AnimationsEnabled, 1) AS AnimationsEnabled,
            DebeCambiarPassword, TokenVersion
        FROM dbo.Usuarios
        WHERE UsuarioId = @UsuarioId;
    END
    ELSE
    BEGIN
        RETURN;
    END
END

