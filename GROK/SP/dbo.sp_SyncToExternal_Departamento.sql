IF OBJECT_ID('dbo.sp_SyncToExternal_Departamento') IS NOT NULL      DROP PROCEDURE dbo.sp_SyncToExternal_Departamento;
GO
CREATE PROCEDURE [dbo].[sp_SyncToExternal_Departamento]
    @CodRef NVARCHAR(50),
    @Nombre NVARCHAR(100),
    @Abreviatura NVARCHAR(50),
    @Status CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM sys.servers WHERE name = 'bmsjs') BEGIN
        PRINT 'Servidor vinculado [bmsjs] no encontrado. Omitiendo PUSH.';
        RETURN;
    END

    BEGIN TRY
        MERGE INTO [bmsjs].[dbo].[departamentos] AS Target
        USING (SELECT @CodRef AS departamento, @Nombre AS nombre, @Abreviatura AS abreviatura, @Status AS status) AS Source 
        ON RTRIM(Target.departamento) = Source.departamento
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
            INSERT (departamento, nombre, abreviatura, status)
            VALUES (Source.departamento, Source.nombre, Source.abreviatura, Source.status);
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Departamento: ' + ERROR_MESSAGE();
    END CATCH
END
