-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPassword]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuario_ActualizarPassword]
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
GO