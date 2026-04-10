CREATE PROCEDURE [dbo].[sp_CatalogoProcesosAutomaticos_Upsert]
    @ProcesoId INT = NULL OUTPUT,
    @Nombre NVARCHAR(100),
    @KeyInterna NVARCHAR(50),
    @Descripcion NVARCHAR(500) = NULL,
    @CronExpression NVARCHAR(50),
    @Activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @ProcesoId IS NULL OR @ProcesoId <= 0
    BEGIN
        INSERT INTO dbo.CatalogoProcesosAutomaticos (
            Nombre, KeyInterna, Descripcion, CronExpression, Activo
        )
        VALUES (
            @Nombre, @KeyInterna, @Descripcion, @CronExpression, @Activo
        );
        
        SET @ProcesoId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.CatalogoProcesosAutomaticos
        SET 
            Nombre = @Nombre,
            KeyInterna = @KeyInterna,
            Descripcion = @Descripcion,
            CronExpression = @CronExpression,
            Activo = @Activo
        WHERE ProcesoId = @ProcesoId;
    END

    -- Return the inserted/updated ID
    SELECT @ProcesoId AS ProcesoId;
END
GO
