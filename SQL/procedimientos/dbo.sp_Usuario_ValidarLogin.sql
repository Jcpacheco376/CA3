-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ValidarLogin]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuario_ValidarLogin]
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
GO