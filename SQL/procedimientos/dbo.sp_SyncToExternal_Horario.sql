USE [CA]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_SyncToExternal_Horario]
    @CodRef NVARCHAR(50),
    @Nombre NVARCHAR(100),
    @MinutosTolerancia INT,
    @Status CHAR(1),
    @Detalles NVARCHAR(MAX) -- Corregido: JSON no es un tipo de dato nativo, usamos NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @TargetDB NVARCHAR(100);
    SELECT TOP 1 @TargetDB = ConfigValue FROM dbo.ConfiguracionSistema WHERE ConfigKey = 'DBENTRADA';
    
    IF @TargetDB IS NULL OR @TargetDB = ''
    BEGIN
        PRINT 'Configuración DBENTRADA no encontrada. Omitiendo PUSH.';
        RETURN;
    END

    DECLARE @SQLHeader NVARCHAR(MAX);
    DECLARE @SQLDetails NVARCHAR(MAX);

    -- 1. Sync Header (Horarios)
    SET @SQLHeader = '
    MERGE INTO ' + QUOTENAME(@TargetDB) + '.[dbo].[horarios] AS Target
    USING (SELECT @CodRef AS horario, @Nombre AS nombre, @MinutosTolerancia AS minutos_tolerancia, @Status AS status) AS Source 
    ON RTRIM(Target.horario) = Source.horario
    WHEN MATCHED AND (
        RTRIM(Target.nombre) <> Source.nombre OR 
        Target.minutos_tolerancia <> Source.minutos_tolerancia OR
        Target.status <> Source.status
    ) THEN
        UPDATE SET 
            Target.nombre = Source.nombre,
            Target.minutos_tolerancia = Source.minutos_tolerancia,
            Target.status = Source.status
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (horario, nombre, minutos_tolerancia, status)
        VALUES (Source.horario, Source.nombre, Source.minutos_tolerancia, Source.status);';

    BEGIN TRY
        EXEC sp_executesql @SQLHeader, 
            N'@CodRef NVARCHAR(50), @Nombre NVARCHAR(100), @MinutosTolerancia INT, @Status CHAR(1)',
            @CodRef, @Nombre, @MinutosTolerancia, @Status;
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Horario Header: ' + ERROR_MESSAGE();
        RETURN; -- Si falla header, no intentar detalles
    END CATCH

    -- 2. Sync Details (mhorarios)
    -- Asumimos que @Detalles tiene la estructura: [{DiaSemana, EsDiaLaboral, HoraEntrada, ...}]
    
    BEGIN TRY
        SET @SQLDetails = '
        DELETE FROM ' + QUOTENAME(@TargetDB) + '.[dbo].[mhorarios] WHERE horario = @CodRef;

        INSERT INTO ' + QUOTENAME(@TargetDB) + '.[dbo].[mhorarios] (
            horario, dia_semana,
            horas_entrada1, minutos_entrada1,
            horas_salida1, minutos_salida1,
            horas_entrada2, minutos_entrada2, 
            horas_salida2, minutos_salida2
        )
        SELECT 
            @CodRef, 
            -- Mapeo DiaSemana:
            -- App (0=Dom...6=Sab) o (1=Dom...7=Sab)?
            -- Asumiremos 1=Lunes en App porque sp_SyncFromBMS convierte BMS (unknown) -> App.
            -- sp_SyncFromBMS: CASE CAST(m.dia_semana AS INT) WHEN 1 THEN 7 ELSE ... -1 END
            -- Si BMS 1=Domingo -> App 7 (Domingo).
            -- Si BMS 2=Lunes -> App 1 (Lunes).
            -- Entonces App usa 1=Lunes ... 7=Domingo.
            -- BMS usa 1=Dom, 2=Lun, 3=Mar, 4=Mier, 5=Jue, 6=Vie, 7=Sab.
            -- Reverse Mapping:
            -- App 1 (Lun) + 1 = 2 (Lun BMS). Correcto.
            -- App 6 (Sab) + 1 = 7 (Sab BMS). Correcto.
            -- App 7 (Dom) -> 1 (Dom BMS). Special Case.
            CASE WHEN DiaSemana = 7 THEN 1 ELSE DiaSemana + 1 END,
            
            DATEPART(HOUR, HoraEntrada), DATEPART(MINUTE, HoraEntrada),
            DATEPART(HOUR, HoraSalida), DATEPART(MINUTE, HoraSalida),
            DATEPART(HOUR, HoraFinComida), DATEPART(MINUTE, HoraFinComida), -- BMS entrada2 es fin comida
            DATEPART(HOUR, HoraInicioComida), DATEPART(MINUTE, HoraInicioComida) -- BMS salida2 es inicio comida
        FROM OPENJSON(@Detalles)
        WITH (
            DiaSemana INT,
            EsDiaLaboral BIT,
            HoraEntrada DATETIME, -- Usar DATETIME para asegurar parsing de strings ISO8601 o similar
            HoraSalida DATETIME,
            HoraInicioComida DATETIME,
            HoraFinComida DATETIME
        )
        WHERE EsDiaLaboral = 1;';

        EXEC sp_executesql @SQLDetails, N'@CodRef NVARCHAR(50), @Detalles NVARCHAR(MAX)', @CodRef, @Detalles;
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Horario Details: ' + ERROR_MESSAGE();
    END CATCH
END
