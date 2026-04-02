-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_Actualizar]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

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