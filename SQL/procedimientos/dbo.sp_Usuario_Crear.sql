IF OBJECT_ID('dbo.sp_Usuario_Crear') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_Crear;
GO
CREATE PROCEDURE sp_Usuario_Crear
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
        RAISERROR ('El correo electrónico ya está en uso.', 16, 1);
        RETURN;
    END

    -- Insertar el nuevo usuario con la contraseña encriptada
    INSERT INTO Usuarios (NombreUsuario, PasswordHash, NombreCompleto, Email)
    VALUES (@NombreUsuario, PWDENCRYPT(@Password), @NombreCompleto, @Email);

    -- Devolver el ID del usuario recién creado
    SET @NuevoUsuarioId = SCOPE_IDENTITY();
END

