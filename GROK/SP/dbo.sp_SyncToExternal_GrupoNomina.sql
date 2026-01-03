IF OBJECT_ID('dbo.sp_SyncToExternal_GrupoNomina') IS NOT NULL      DROP PROCEDURE dbo.sp_SyncToExternal_GrupoNomina;
GO
CREATE PROCEDURE [dbo].[sp_SyncToExternal_GrupoNomina]
    @CodRef NVARCHAR(50),      -- El CodRef local (que es 'grupo_nomina' en bmsjs)
    @Nombre NVARCHAR(100),
    @Abreviatura NVARCHAR(50),
    @Status CHAR(1)          -- 'V' para Activo, 'B' para Baja
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Validar que el servidor vinculado exista
    IF NOT EXISTS (SELECT 1 FROM sys.servers WHERE name = 'bmsjs')
    BEGIN
        PRINT 'Servidor vinculado [bmsjs] no encontrado. Omitiendo PUSH.';
        RETURN;
    END

    -- Intentar el MERGE en el servidor remoto
    BEGIN TRY
        PRINT 'Sincronizando (PUSH) GrupoNomina ' + @CodRef + ' hacia bmsjs...';
        
        MERGE INTO [bmsjs].[dbo].[grupos_nomina] AS Target
        USING (
            SELECT 
                @CodRef AS grupo_nomina, 
                @Nombre AS nombre, 
                @Abreviatura AS abreviatura, 
                @Status AS status
        ) AS Source ON RTRIM(Target.grupo_nomina) = Source.grupo_nomina
        
        -- Si existe y algo cambió, actualizarlo
        WHEN MATCHED AND (
            RTRIM(Target.nombre) <> Source.nombre OR 
            RTRIM(Target.abreviatura) <> Source.abreviatura OR 
            Target.status <> Source.status
        ) THEN
            UPDATE SET 
                Target.nombre = Source.nombre,
                Target.abreviatura = Source.abreviatura,
                Target.status = Source.status
        
        -- Si no existe en el remoto, crearlo
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (grupo_nomina, nombre, abreviatura, status)
            VALUES (Source.grupo_nomina, Source.nombre, Source.abreviatura, Source.status);
            
        PRINT 'Sincronización (PUSH) para ' + @CodRef + ' completada.';
            
    END TRY
    BEGIN CATCH
        -- Si la sincronización (push) falla, solo imprimimos el error.
        -- NO lanzamos un THROW, para no hacer fallar la transacción de la API.
        PRINT 'Error en sp_SyncToExternal_GrupoNomina: ' + ERROR_MESSAGE();
    END CATCH
END
