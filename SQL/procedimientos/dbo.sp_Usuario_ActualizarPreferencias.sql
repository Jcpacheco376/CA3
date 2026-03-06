-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPreferencias]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
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