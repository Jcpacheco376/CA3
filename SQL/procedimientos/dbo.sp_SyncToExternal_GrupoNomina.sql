-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_SyncToExternal_GrupoNomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_SyncToExternal_GrupoNomina]
    @CodRef NVARCHAR(50),
    @Nombre NVARCHAR(100),
    @Status CHAR(1)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TargetDB NVARCHAR(100);
    SELECT TOP 1 @TargetDB = ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'DBENTRADA';
    
    IF @TargetDB IS NULL OR @TargetDB = ''
    BEGIN
        PRINT 'Configuración DBENTRADA no encontrada. Omitiendo PUSH.';
        RETURN;
    END
    DECLARE @SQL NVARCHAR(MAX);
    
    SET @SQL = '
    MERGE INTO ' + QUOTENAME(@TargetDB) + '.[dbo].[grupos_nomina] AS Target
    USING (SELECT @CodRef AS grupo_nomina, @Nombre AS nombre, @Status AS status) AS Source 
    ON RTRIM(Target.grupo_nomina) = Source.grupo_nomina
    WHEN MATCHED AND (
        RTRIM(Target.nombre) <> Source.nombre OR 
        Target.status <> Source.status
    ) THEN
        UPDATE SET 
            Target.nombre = Source.nombre,
            Target.status = Source.status
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (grupo_nomina, nombre, status)
        VALUES (Source.grupo_nomina, Source.nombre, Source.status);';
    BEGIN TRY
        EXEC sp_executesql @SQL, 
            N'@CodRef NVARCHAR(50), @Nombre NVARCHAR(100), @Status CHAR(1)',
            @CodRef, @Nombre, @Status;
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_GrupoNomina: ' + ERROR_MESSAGE();
    END CATCH
END
GO