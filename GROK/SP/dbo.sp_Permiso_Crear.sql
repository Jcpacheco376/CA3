IF OBJECT_ID('dbo.sp_Permiso_Crear') IS NOT NULL      DROP PROCEDURE dbo.sp_Permiso_Crear;
GO
CREATE PROCEDURE sp_Permiso_Crear
    @NombrePermiso NVARCHAR(100),
    @Descripcion NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM Permisos WHERE NombrePermiso = @NombrePermiso)
    BEGIN
        INSERT INTO Permisos (NombrePermiso, Descripcion)
        VALUES (@NombrePermiso, @Descripcion);
    END
    ELSE
    BEGIN
        RAISERROR ('El nombre del permiso ya existe.', 16, 1);
        RETURN;
    END
END

