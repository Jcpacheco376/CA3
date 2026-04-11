-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_ActualizarPreferencias]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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