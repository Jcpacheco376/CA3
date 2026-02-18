IF OBJECT_ID('dbo.sp_Usuario_Actualizar') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuario_Actualizar;
GO
CREATE PROCEDURE sp_Usuario_Actualizar
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

