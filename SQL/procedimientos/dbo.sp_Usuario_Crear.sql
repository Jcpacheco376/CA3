-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuario_Crear]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Usuario_Crear
    @NombreUsuario NVARCHAR(50),
    @Password NVARCHAR(100),
    @NombreCompleto NVARCHAR(100),
    @Email NVARCHAR(100),
    @NuevoUsuarioId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar que el nombre de usuario no exista
    IF EXISTS (SELECT 1 FROM Usuarios WHERE NombreUsuario = @NombreUsuario)
    BEGIN
        RAISERROR ('El nombre de usuario ya existe.', 16, 1);
        RETURN;
    END

    -- Validar que el email no exista
    IF EXISTS (SELECT 1 FROM Usuarios WHERE Email = @Email)
    BEGIN
        RAISERROR ('El correo electronico ya esta en uso.', 16, 1);
        RETURN;
    END

    -- Insertar el nuevo usuario con la contrase�a encriptada
    INSERT INTO Usuarios (NombreUsuario, PasswordHash, NombreCompleto, Email)
    VALUES (@NombreUsuario, PWDENCRYPT(@Password), @NombreCompleto, @Email);

    -- Devolver el ID del usuario reci�n creado
    SET @NuevoUsuarioId = SCOPE_IDENTITY();
END
GO