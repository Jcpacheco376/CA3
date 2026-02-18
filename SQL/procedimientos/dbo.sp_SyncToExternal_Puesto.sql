IF OBJECT_ID('dbo.sp_SyncToExternal_Puesto') IS NOT NULL      DROP PROCEDURE dbo.sp_SyncToExternal_Puesto;
GO
CREATE PROCEDURE [dbo].[sp_SyncToExternal_Puesto]
    @CodRef NVARCHAR(50),     
    @Nombre NVARCHAR(100),
    @Status CHAR(1) 
AS
BEGIN
    SET NOCOUNT ON;
    
    IF NOT EXISTS (SELECT 1 FROM sys.servers WHERE name = 'bmsjs')
    BEGIN
        PRINT 'Servidor vinculado [bmsjs] no encontrado. Omitiendo PUSH.';
        RETURN;
    END

    BEGIN TRY
        PRINT 'Sincronizando (PUSH) Puesto ' + @CodRef + ' hacia bmsjs...';
        
        MERGE INTO [bmsjs].[dbo].[puestos] AS Target
        USING (
            SELECT 
                @CodRef AS puesto, 
                @Nombre AS nombre, 
                @Status AS status
        ) AS Source ON RTRIM(Target.puesto) = Source.puesto
        
        WHEN MATCHED AND (
            RTRIM(Target.nombre) <> Source.nombre OR 
            Target.status <> Source.status
        ) THEN
            UPDATE SET 
                Target.nombre = Source.nombre,
                Target.status = Source.status
        
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (puesto, nombre, status)
            VALUES (Source.puesto, Source.nombre, Source.status);
            
        PRINT 'Sincronización (PUSH) para ' + @CodRef + ' completada.';
            
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Puesto: ' + ERROR_MESSAGE();
    END CATCH
END
