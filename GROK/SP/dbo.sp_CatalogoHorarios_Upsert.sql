IF OBJECT_ID('dbo.sp_CatalogoHorarios_Upsert') IS NOT NULL      DROP PROCEDURE dbo.sp_CatalogoHorarios_Upsert;
GO
CREATE PROCEDURE [dbo].[sp_CatalogoHorarios_Upsert]
    @HorarioId INT,
    @Abreviatura NVARCHAR(10),
    @Nombre NVARCHAR(100),
    @MinutosTolerancia INT,
    @ColorUI NVARCHAR(50),
    @Activo BIT, -- Activo del Horario (maestro)
    @esRotativo BIT,
    @DetallesJSON NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @CalculatedTurno CHAR(1) = '';

    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (
            SELECT 1 
            FROM dbo.CatalogoHorarios 
            WHERE Abreviatura = @Abreviatura 
              AND HorarioId != ISNULL(@HorarioId, 0) 
              AND LTRIM(RTRIM(@Abreviatura)) <> ''
              AND Activo = 1 -- Solo conflicto si el duplicado está ACTIVO
        )
        BEGIN
            PRINT 'ERROR: Conflicto de abreviatura encontrada.';
            ROLLBACK;
            RAISERROR ('La abreiatura del horario ya está en uso por otro horario activo.', 16, 1);
            RETURN;
        END

        -- Upsert en la tabla maestra (sin cambios)
        IF @HorarioId IS NOT NULL AND @HorarioId > 0
        BEGIN
            UPDATE dbo.CatalogoHorarios SET Abreviatura = LTRIM(RTRIM(@Abreviatura)), Nombre = @Nombre, MinutosTolerancia = @MinutosTolerancia, ColorUI = @ColorUI, Activo = @Activo, EsRotativo = @esRotativo WHERE HorarioId = @HorarioId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.CatalogoHorarios (Abreviatura, Nombre, MinutosTolerancia, ColorUI, Activo, EsRotativo) VALUES (LTRIM(RTRIM(@Abreviatura)), @Nombre, @MinutosTolerancia, @ColorUI, @Activo, @esRotativo);
            SET @HorarioId = SCOPE_IDENTITY();
        END
        DELETE FROM dbo.CatalogoHorariosDetalle 
        WHERE HorarioId = @HorarioId;
            
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

        SET @CalculatedTurno = NULL; -- Empezar como NULL
        DECLARE @DistinctTurnos INT = 0;
        
        IF @esRotativo = 0
        BEGIN
             -- *** INICIO: FIX CTE SCOPE ***
             -- Calcular @DistinctTurnos Y @CalculatedTurno DENTRO del mismo scope del CTE
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
                 -- Asignar el turno SOLO si hay exactamente 1 distinto
                 @CalculatedTurno = CASE WHEN COUNT(DISTINCT DiaTurno) = 1 THEN MIN(DiaTurno) ELSE NULL END
             FROM DailyTurnos;
             -- *** FIN: FIX CTE SCOPE ***

        END
        
        -- Ajustar si la columna 'turno' no permite NULL
        IF @CalculatedTurno IS NULL AND (SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CatalogoHorarios' AND COLUMN_NAME = 'turno') = 'NO'
        BEGIN 
            SET @CalculatedTurno = ''; 
      
        END

        UPDATE dbo.CatalogoHorarios SET turno = @CalculatedTurno WHERE HorarioId = @HorarioId;

        COMMIT TRANSACTION;
        SELECT H.HorarioId, H.turno, H.EsRotativo, H.Nombre, H.Abreviatura, H.ColorUI FROM dbo.CatalogoHorarios H WHERE H.HorarioId = @HorarioId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 
        BEGIN
            PRINT 'Rollback Transaction...';
            ROLLBACK TRANSACTION;
            PRINT 'Transaction Rolled Back.';
        END
        
        PRINT 'Rethrowing error...';
        THROW; -- Re-lanza el error para que la API lo reciba
    END CATCH
END

