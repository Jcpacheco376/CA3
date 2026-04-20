-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_Actualizar]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Usuario_Actualizar
    @UsuarioId INT,
    @NombreCompleto NVARCHAR(100),
    @Email NVARCHAR(100),
    @EstaActivo BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Usuarios
    SET
        NombreCompleto = @NombreCompleto,
        Email = @Email,
        EstaActivo = @EstaActivo
    WHERE
        UsuarioId = @UsuarioId;
END
GO