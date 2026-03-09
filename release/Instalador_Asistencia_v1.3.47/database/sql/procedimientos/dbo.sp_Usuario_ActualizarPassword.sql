-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPassword]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPassword]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
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