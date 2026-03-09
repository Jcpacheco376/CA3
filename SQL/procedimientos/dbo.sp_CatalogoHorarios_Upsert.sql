-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoHorarios_Upsert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_CatalogoHorarios_Upsert]
    @HorarioId INT,
    @Abreviatura NVARCHAR(10),
    @Nombre NVARCHAR(100),
    @MinutosTolerancia INT,
    @ColorUI NVARCHAR(50),
    @Activo BIT, 
    @esRotativo BIT,
    @DetallesJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @CalculatedTurno CHAR(1) = '';

    BEGIN TRY
        BEGIN TRANSACTION;
        
        -- 1. Validaci�n de duplicados
        IF EXISTS (
            SELECT 1 
            FROM dbo.CatalogoHorarios 
            WHERE Abreviatura = @Abreviatura 
              AND HorarioId != ISNULL(@HorarioId, 0) 
              AND LTRIM(RTRIM(@Abreviatura)) <> ''
              AND Activo = 1 
        )
        BEGIN
            PRINT 'ERROR: Conflicto de abreviatura encontrada.';
            ROLLBACK;
            RAISERROR ('La abreviatura del horario ya est� en uso por otro horario activo.', 16, 1);
            RETURN;
        END

        -- 2. Upsert en Cabecera Local
        IF @HorarioId IS NOT NULL AND @HorarioId > 0
        BEGIN
            UPDATE dbo.CatalogoHorarios 
            SET Abreviatura = LTRIM(RTRIM(@Abreviatura)), 
                Nombre = @Nombre, 
                MinutosTolerancia = @MinutosTolerancia, 
                ColorUI = @ColorUI, 
                Activo = @Activo, 
                EsRotativo = @esRotativo 
            WHERE HorarioId = @HorarioId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.CatalogoHorarios (Abreviatura, Nombre, MinutosTolerancia, ColorUI, Activo, EsRotativo) 
            VALUES (LTRIM(RTRIM(@Abreviatura)), @Nombre, @MinutosTolerancia, @ColorUI, @Activo, @esRotativo);
            SET @HorarioId = SCOPE_IDENTITY();
        END

        -- 3. Actualizaci�n de Detalles Locales
        DELETE FROM dbo.CatalogoHorariosDetalle WHERE HorarioId = @HorarioId;
            
        INSERT INTO dbo.CatalogoHorariosDetalle (HorarioId, DiaSemana, EsDiaLaboral, HoraEntrada, HoraSalida, HoraInicioComida, HoraFinComida) 
        SELECT
            @HorarioId,
            j.DiaSemana,
            j.EsDiaLaboral,
            CASE WHEN j.EsDiaLaboral = 1 THEN j.HoraEntrada ELSE NULL END,
            CASE WHEN j.EsDiaLaboral = 1 THEN j.HoraSalida ELSE NULL END,
            CASE WHEN j.EsDiaLaboral = 1 AND j.TieneComida = 1 AND j.HoraInicioComida <> '00:00:00' THEN j.HoraInicioComida ELSE NULL END,
            CASE WHEN j.EsDiaLaboral = 1 AND j.TieneComida = 1 AND j.HoraFinComida <> '00:00:00' THEN j.HoraFinComida ELSE NULL END
        FROM OPENJSON(@DetallesJSON)
        WITH (
            DiaSemana INT '$.DiaSemana', 
            EsDiaLaboral BIT '$.EsDiaLaboral', 
            TieneComida BIT '$.TieneComida', 
            HoraEntrada TIME '$.HoraEntrada', 
            HoraSalida TIME '$.HoraSalida', 
            HoraInicioComida TIME '$.HoraInicioComida', 
            HoraFinComida TIME '$.HoraFinComida'
        ) AS j;

        -- 4. C�lculo de Turno Autom�tico
        SET @CalculatedTurno = NULL;
        DECLARE @DistinctTurnos INT = 0;
        
        IF @esRotativo = 0
        BEGIN
             WITH DailyTurnos AS (
                 SELECT 
                     CASE 
                         WHEN DATEPART(HOUR, HoraEntrada) >= 5 AND DATEPART(HOUR, HoraEntrada) < 12 THEN 'M' 
                         WHEN DATEPART(HOUR, HoraEntrada) >= 12 AND DATEPART(HOUR, HoraEntrada) < 20 THEN 'V' 
                         WHEN DATEPART(HOUR, HoraEntrada) >= 20 OR DATEPART(HOUR, HoraEntrada) < 5 THEN 'N' 
                         ELSE NULL 
                     END AS DiaTurno
                 FROM dbo.CatalogoHorariosDetalle 
                 WHERE HorarioId = @HorarioId 
                   AND EsDiaLaboral = 1 
                   AND HoraEntrada IS NOT NULL
             )
             SELECT 
                 @DistinctTurnos = COUNT(DISTINCT DiaTurno),
                 @CalculatedTurno = CASE WHEN COUNT(DISTINCT DiaTurno) = 1 THEN MIN(DiaTurno) ELSE NULL END
             FROM DailyTurnos;
        END
        
        IF @CalculatedTurno IS NULL AND (SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CatalogoHorarios' AND COLUMN_NAME = 'turno') = 'NO'
        BEGIN 
            SET @CalculatedTurno = ''; 
        END

        UPDATE dbo.CatalogoHorarios SET turno = @CalculatedTurno WHERE HorarioId = @HorarioId;

        -- =========================================================================
        -- 5. SINCRONIZACI�N (NUEVA INTEGRACI�N)
        -- =========================================================================
        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncHorarios') = 'true'
        BEGIN
            PRINT 'Paso Sync: Sincronizaci�n (PUSH) de Horario habilitada.';
            EXEC [dbo].[sp_SyncToExternal_Horario] @HorarioId = @HorarioId;
        END
        ELSE
        BEGIN
             PRINT 'Paso Sync: Sincronizaci�n (PUSH) deshabilitada.';
        END

        COMMIT TRANSACTION;
        
        -- Retorno de datos a la UI/API
        SELECT H.HorarioId, H.turno, H.EsRotativo, H.Nombre, H.Abreviatura, H.ColorUI 
        FROM dbo.CatalogoHorarios H 
        WHERE H.HorarioId = @HorarioId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 
        BEGIN
            PRINT 'Rollback Transaction...';
            ROLLBACK TRANSACTION;
            PRINT 'Transaction Rolled Back.';
        END
        
        PRINT 'Error en sp_CatalogoHorarios_Upsert: ' + ERROR_MESSAGE();
        THROW; 
    END CATCH
END
GO