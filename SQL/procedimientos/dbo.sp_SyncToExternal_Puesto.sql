-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_SyncToExternal_Puesto]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_SyncToExternal_Puesto]
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
    MERGE INTO ' + QUOTENAME(@TargetDB) + '.[dbo].[puestos] AS Target
    USING (SELECT @CodRef AS puesto, @Nombre AS nombre, @Status AS status) AS Source 
    ON RTRIM(Target.puesto) = Source.puesto
    WHEN MATCHED AND (
        RTRIM(Target.nombre) <> Source.nombre OR 
        Target.status <> Source.status
    ) THEN
        UPDATE SET 
            Target.nombre = Source.nombre,
            Target.status = Source.status
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (puesto, nombre, status)
        VALUES (Source.puesto, Source.nombre, Source.status);';
    BEGIN TRY
        EXEC sp_executesql @SQL, 
            N'@CodRef NVARCHAR(50), @Nombre NVARCHAR(100), @Status CHAR(1)',
            @CodRef, @Nombre, @Status;
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Puesto: ' + ERROR_MESSAGE();
    END CATCH
END
GO