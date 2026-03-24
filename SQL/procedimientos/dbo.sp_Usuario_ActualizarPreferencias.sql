-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPreferencias]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuario_ActualizarPreferencias]
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
GO