-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPassword]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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
            DebeCambiarPassword = 0 
        WHERE UsuarioId = @UsuarioId;
    END
END
GO