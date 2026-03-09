-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_SyncToExternal_Departamento]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_SyncToExternal_Departamento]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_SyncToExternal_Departamento]
    @CodRef NVARCHAR(50),
    @Nombre NVARCHAR(100),
    @Abreviatura NVARCHAR(50),
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
    MERGE INTO ' + QUOTENAME(@TargetDB) + '.[dbo].[departamentos] AS Target
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
        VALUES (Source.departamento, Source.nombre, Source.abreviatura, Source.status);';
    BEGIN TRY
        EXEC sp_executesql @SQL, 
            N'@CodRef NVARCHAR(50), @Nombre NVARCHAR(100), @Abreviatura NVARCHAR(50), @Status CHAR(1)',
            @CodRef, @Nombre, @Abreviatura, @Status;
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Departamento: ' + ERROR_MESSAGE();
    END CATCH
END
GO