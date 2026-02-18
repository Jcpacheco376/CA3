IF OBJECT_ID('dbo.sp_Rol_Crear') IS NOT NULL      DROP PROCEDURE dbo.sp_Rol_Crear;
GO
CREATE PROCEDURE sp_Rol_Crear
    @NombreRol NVARCHAR(50),
    @Descripcion NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Roles WHERE NombreRol = @NombreRol)
    BEGIN
        INSERT INTO Roles (NombreRol, Descripcion)
        VALUES (@NombreRol, @Descripcion);
    END
    ELSE
    BEGIN
        RAISERROR ('El nombre del rol ya existe.', 16, 1);
        RETURN;
    END
END

