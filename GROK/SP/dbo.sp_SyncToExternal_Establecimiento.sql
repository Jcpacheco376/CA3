IF OBJECT_ID('dbo.sp_SyncToExternal_Establecimiento') IS NOT NULL      DROP PROCEDURE dbo.sp_SyncToExternal_Establecimiento;
GO
CREATE PROCEDURE [dbo].[sp_SyncToExternal_Establecimiento]
    @CodRef NVARCHAR(50),     
    @Nombre NVARCHAR(100),
    @Abreviatura NVARCHAR(50),
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
        PRINT 'Sincronizando (PUSH) Establecimiento ' + @CodRef + ' hacia bmsjs...';
        MERGE INTO [bmsjs].[dbo].[establecimientos] AS Target
        USING (
            SELECT 
                @CodRef AS cod_estab, 
                @Nombre AS nombre, 
                @Abreviatura AS abreviatura, 
                @Status AS status
        ) AS Source ON RTRIM(Target.cod_estab) = Source.cod_estab
        
        WHEN MATCHED AND (
            RTRIM(Target.nombre) <> Source.nombre OR 
            RTRIM(Target.abreviatura) <> Source.abreviatura OR 
            Target.status <> Source.status
        ) THEN
            UPDATE SET 
                Target.nombre = Source.nombre,
                Target.abreviatura = Source.abreviatura,
                Target.status = Source.status
        
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (cod_estab, nombre, abreviatura, status)
            VALUES (Source.cod_estab, Source.nombre, Source.abreviatura, Source.status);
            
        PRINT 'Sincronización (PUSH) para ' + @CodRef + ' completada.';
            
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Establecimiento: ' + ERROR_MESSAGE();
    END CATCH
END

