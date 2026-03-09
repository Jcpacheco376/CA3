-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_Actualizar]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_Actualizar]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
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