IF OBJECT_ID('dbo.sp_Establecimientos_Save') IS NOT NULL      DROP PROCEDURE dbo.sp_Establecimientos_Save;
GO
CREATE PROCEDURE [dbo].[sp_Establecimientos_Save]
    @EstablecimientoId INT, 
    @CodRef NVARCHAR(50),
    @Nombre NVARCHAR(100),
    @Abreviatura NVARCHAR(50),
    @Activo BIT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        BEGIN TRANSACTION;

        -- --- PASO 1: Guardado Local ---
        MERGE dbo.CatalogoEstablecimientos AS Target
        USING (
            SELECT @EstablecimientoId AS EstablecimientoId
        ) AS Source ON Target.EstablecimientoId = Source.EstablecimientoId
        WHEN MATCHED THEN
            UPDATE SET 
                CodRef = @CodRef,
                Nombre = @Nombre,
                Abreviatura = @Abreviatura,
                Activo = @Activo
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (EstablecimientoId, CodRef, Nombre, Abreviatura, Activo)
            VALUES (@EstablecimientoId, @CodRef, @Nombre, @Abreviatura, @Activo);
        
        PRINT 'Paso 1: Guardado local de Establecimiento completado.';

        -- --- PASO 2: Verificar Configuración de Sincronización ---
        IF (SELECT ConfigValue FROM dbo.ConfiguracionSistema WHERE ConfigKey = 'SyncEstablecimientos') = 'true'
        BEGIN
            PRINT 'Paso 2: Sincronización (PUSH) habilitada. Intentando...';
            
            -- --- PASO 3: Intentar el "Push" Externo ---
            DECLARE @Status CHAR(1) = CASE WHEN @Activo = 1 THEN 'V' ELSE 'C' END;
            
            EXEC [dbo].[sp_SyncToExternal_Establecimiento]
                @CodRef = @CodRef,
                @Nombre = @Nombre,
                @Abreviatura = @Abreviatura,
                @Status = @Status;
                
            PRINT 'Paso 3: Llamada a sp_SyncToExternal_Establecimiento finalizada.';
        END
        ELSE
        BEGIN
            PRINT 'Paso 2: Sincronización (PUSH) deshabilitada. Omitiendo.';
        END

        COMMIT TRANSACTION;
        PRINT 'Transacción local completada (COMMIT).';

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        PRINT 'Error en sp_Establecimientos_Save: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
