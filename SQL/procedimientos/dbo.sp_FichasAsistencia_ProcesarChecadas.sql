-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_FichasAsistencia_ProcesarChecadas]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_FichasAsistencia_ProcesarChecadas]
    @FechaInicio DATE,
    @FechaFin DATE,
    @UsuarioId INT = NULL,
    @EmpleadoId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET DATEFIRST 1; -- Lunes es el primer d�a de la semana

    DECLARE @Reintentos TINYINT = 0;
    DECLARE @MaxReintentos TINYINT = 3;
    DECLARE @Ahora DATETIME = GETDATE();

    -- 1. FRENO DE MANO
    IF @FechaFin > CAST(GETDATE() AS DATE) SET @FechaFin = CAST(GETDATE() AS DATE);
    IF @FechaInicio > @FechaFin RETURN;

    -- 2. EMPLEADOS A PROCESAR
    DECLARE @EmpleadosAProcesar TABLE (EmpleadoId INT PRIMARY KEY, CodRef NVARCHAR(20), HorarioIdPredeterminado INT);
    
    INSERT INTO @EmpleadosAProcesar (EmpleadoId, CodRef, HorarioIdPredeterminado)
    SELECT EmpleadoId, CodRef, HorarioIdPredeterminado 
    FROM dbo.Empleados 
    WHERE Activo = 1
      AND (@EmpleadoId IS NULL OR EmpleadoId = @EmpleadoId);

    IF NOT EXISTS (SELECT 1 FROM @EmpleadosAProcesar) RETURN;

    -- 3. IDs DE ESTATUS
    DECLARE @IdFalta INT, @IdAsistencia INT, @IdRetardo INT, @IdIncompleta INT, @IdDescanso INT, @IdSinHorario INT;

    SELECT  @IdFalta      = EstatusId FROM dbo.CatalogoEstatusAsistencia WHERE TipoCalculoId = 'FALTA'       AND Activo = 1;
    SELECT  @IdAsistencia = EstatusId FROM dbo.CatalogoEstatusAsistencia WHERE TipoCalculoId = 'ASISTENCIA'  AND Activo = 1;
    SELECT  @IdRetardo    = EstatusId FROM dbo.CatalogoEstatusAsistencia WHERE TipoCalculoId = 'RETARDO'     AND Activo = 1;
    SELECT  @IdIncompleta = EstatusId FROM dbo.CatalogoEstatusAsistencia WHERE TipoCalculoId = 'INCOMPLETA'  AND Activo = 1;
    SELECT  @IdDescanso   = EstatusId FROM dbo.CatalogoEstatusAsistencia WHERE TipoCalculoId = 'DESCANSO'    AND Activo = 1;
    SELECT  @IdSinHorario = EstatusId FROM dbo.CatalogoEstatusAsistencia WHERE TipoCalculoId = 'SIN_HORARIO' AND Activo = 1; 
    
    IF @IdFalta IS NULL SET @IdFalta = 1; 
    IF @IdSinHorario IS NULL SET @IdSinHorario = @IdFalta;

    -------------------------------------------------------------------
    -- 4. C�LCULO CON ARITM�TICA  
    -------------------------------------------------------------------
    ;WITH 
    FechasDelRango AS (
        SELECT CAST(DATEADD(DAY, number, @FechaInicio) AS DATE) AS Fecha
        FROM master.dbo.spt_values WHERE type = 'P' AND DATEADD(DAY, number, @FechaInicio) <= @FechaFin
    ),

    -- A. Horario Base
    HorarioBase AS (
        SELECT
            e.EmpleadoId, e.CodRef, fr.Fecha,
            CASE 
                WHEN ht.TipoAsignacion = 'H' THEN ht.HorarioId 
                WHEN ht.TipoAsignacion = 'T' THEN (SELECT TOP 1 d.HorarioId FROM dbo.CatalogoHorariosDetalle d WHERE d.HorarioDetalleId = ht.HorarioDetalleId) 
                WHEN ht.TipoAsignacion = 'D' THEN NULL 
                ELSE e.HorarioIdPredeterminado 
            END AS HorarioId,
            CASE WHEN ht.TipoAsignacion = 'T' THEN ht.HorarioDetalleId ELSE NULL END AS HorarioDetalleId,
            CASE WHEN ht.TipoAsignacion = 'D' THEN 1 ELSE 0 END AS EsDescansoAsignado
        FROM @EmpleadosAProcesar e CROSS JOIN FechasDelRango fr
        LEFT JOIN dbo.HorariosTemporales ht ON e.EmpleadoId = ht.EmpleadoId AND fr.Fecha = ht.Fecha
    ),

    -- B. Ventanas Calculadas 
    VentanasCalculadas AS (
        SELECT
            hb.EmpleadoId, hb.Fecha, hb.CodRef, hb.HorarioId,
            ISNULL(h.MinutosTolerancia, 0) as MinutosTolerancia,
            ISNULL(hd.EsDiaLaboral, 0) as EsDiaLaboral,
            hb.EsDescansoAsignado,
            
            CASE 
                WHEN hb.EsDescansoAsignado = 1 THEN 0 
                WHEN (h.EsRotativo = 1 AND hb.HorarioDetalleId IS NULL) OR (hb.HorarioId IS NULL AND hb.EsDescansoAsignado = 0) THEN 1 
                ELSE 0 
            END as EsSinHorario,

            CASE WHEN hd.HoraEntrada IS NOT NULL 
                 THEN DATEADD(day, DATEDIFF(day, '19000101', hb.Fecha), CAST(hd.HoraEntrada AS DATETIME))
                 ELSE NULL END AS Turno_Entrada,
            
            CASE WHEN hd.HoraSalida IS NOT NULL THEN
                    CASE WHEN hd.HoraSalida < hd.HoraEntrada 
                         -- Si cruza medianoche, sumamos 1 d�a a la Fecha base
                         THEN DATEADD(day, DATEDIFF(day, '19000101', DATEADD(DAY, 1, hb.Fecha)), CAST(hd.HoraSalida AS DATETIME))
                         ELSE DATEADD(day, DATEDIFF(day, '19000101', hb.Fecha), CAST(hd.HoraSalida AS DATETIME))
                    END
                 ELSE NULL END AS Turno_Salida,

            ISNULL(hd.MinutosAntesEntrada, 120) as Ventana_MinAntes,
            ISNULL(hd.MinutosDespuesSalida, 240) as Ventana_MinDespues

        FROM HorarioBase hb
        LEFT JOIN dbo.CatalogoHorarios h ON hb.HorarioId = h.HorarioId
        LEFT JOIN dbo.CatalogoHorariosDetalle hd ON hb.HorarioId = hd.HorarioId
            AND (
                (ISNULL(h.EsRotativo, 0) = 0 AND hd.DiaSemana = DATEPART(WEEKDAY, hb.Fecha))
                OR
                (h.EsRotativo = 1 AND hb.HorarioDetalleId IS NOT NULL AND hd.HorarioDetalleId = hb.HorarioDetalleId)
            )
    ),

    -- C. Datos Finales
    DatosFinales AS (
        SELECT 
            vc.*,
            CASE 
                WHEN vc.EsDescansoAsignado = 1 THEN CAST(vc.Fecha AS DATETIME)
                ELSE DATEADD(MINUTE, -vc.Ventana_MinAntes, vc.Turno_Entrada) 
            END as Ventana_Inicio,

            CASE 
                WHEN vc.EsDescansoAsignado = 1 THEN DATEADD(SECOND, -1, DATEADD(DAY, 1, CAST(vc.Fecha AS DATETIME)))
                ELSE DATEADD(MINUTE, vc.Ventana_MinDespues, vc.Turno_Salida) 
            END as Ventana_Fin,

            (SELECT MIN(FechaHora) FROM dbo.Checadas c 
             WHERE c.EmpleadoId = vc.EmpleadoId 
               AND c.FechaHora BETWEEN 
                   CASE 
                        WHEN vc.EsDescansoAsignado = 1 THEN CAST(vc.Fecha AS DATETIME)
                        ELSE DATEADD(MINUTE, -vc.Ventana_MinAntes, vc.Turno_Entrada) 
                   END
                   AND 
                   CASE 
                        WHEN vc.EsDescansoAsignado = 1 THEN DATEADD(SECOND, -1, DATEADD(DAY, 1, CAST(vc.Fecha AS DATETIME)))
                        ELSE DATEADD(MINUTE, vc.Ventana_MinDespues, vc.Turno_Salida) 
                   END
            ) as Checada_Entrada,

            (SELECT MAX(FechaHora) FROM dbo.Checadas c 
             WHERE c.EmpleadoId = vc.EmpleadoId 
               AND c.FechaHora BETWEEN 
                   CASE 
                        WHEN vc.EsDescansoAsignado = 1 THEN CAST(vc.Fecha AS DATETIME)
                        ELSE DATEADD(MINUTE, -vc.Ventana_MinAntes, vc.Turno_Entrada) 
                   END
                   AND 
                   CASE 
                        WHEN vc.EsDescansoAsignado = 1 THEN DATEADD(SECOND, -1, DATEADD(DAY, 1, CAST(vc.Fecha AS DATETIME)))
                        ELSE DATEADD(MINUTE, vc.Ventana_MinDespues, vc.Turno_Salida) 
                   END
            ) as Checada_Salida

        FROM VentanasCalculadas vc
    ),

    -- D. PreMerge
    PreMerge AS (
        SELECT 
            df.EmpleadoId, df.Fecha, df.HorarioId,
            df.Ventana_Inicio, df.Ventana_Fin,
            df.Checada_Entrada, df.Checada_Salida,

            CASE
                WHEN df.EsSinHorario = 1 THEN @IdSinHorario
                WHEN df.EsDescansoAsignado = 1 THEN @IdDescanso
                WHEN df.EsDiaLaboral = 0 AND df.Checada_Entrada IS NOT NULL THEN @IdAsistencia
                WHEN df.EsDiaLaboral = 0 THEN @IdDescanso
                WHEN df.EsDiaLaboral = 1 AND df.Checada_Entrada IS NULL THEN @IdFalta
                WHEN df.EsDiaLaboral = 1 
                     AND (df.Checada_Salida IS NULL OR df.Checada_Salida = df.Checada_Entrada) 
                     AND @Ahora > df.Ventana_Fin 
                     THEN @IdIncompleta
                WHEN df.EsDiaLaboral = 1 
                     AND df.Checada_Entrada > DATEADD(MINUTE, df.MinutosTolerancia, df.Turno_Entrada) 
                     THEN @IdRetardo
                WHEN df.EsDiaLaboral = 1 AND df.Checada_Entrada IS NOT NULL THEN @IdAsistencia
                ELSE @IdFalta
            END AS EstatusCalculadoId,

            CASE 
                WHEN df.EsSinHorario = 1 THEN 'SIN_HORARIO'
                WHEN df.EsDiaLaboral = 1 AND df.Ventana_Fin IS NOT NULL AND @Ahora <= df.Ventana_Fin THEN 'EN_PROCESO'
                ELSE 'BORRADOR'
            END AS EstadoCalculado,
            
            ROW_NUMBER() OVER(PARTITION BY df.EmpleadoId, df.Fecha ORDER BY df.HorarioId) as rn

        FROM DatosFinales df
    )
    SELECT * INTO #SourceData FROM PreMerge WHERE rn = 1;

    -- 5. MERGE (Upsert)
    WHILE @Reintentos < @MaxReintentos
    BEGIN
        BEGIN TRY
            BEGIN TRANSACTION;

            MERGE INTO dbo.FichaAsistencia AS Target
            USING #SourceData AS Source
            ON (Target.EmpleadoId = Source.EmpleadoId AND Target.Fecha = Source.Fecha)

            WHEN MATCHED 
                 AND Target.Estado IN ('BORRADOR', 'SIN_HORARIO', 'EN_PROCESO') THEN
                UPDATE SET
                    Target.HoraEntrada = Source.Checada_Entrada,
                    Target.HoraSalida = Source.Checada_Salida,
                    Target.EstatusChecadorId = Source.EstatusCalculadoId,
                    Target.HorarioId = Source.HorarioId,
                    Target.Estado = Source.EstadoCalculado, 
                    Target.VentanaInicio = Source.Ventana_Inicio, 
                    Target.VentanaFin = Source.Ventana_Fin,
                    Target.FechaModificacion = GETDATE()

            WHEN NOT MATCHED BY Target THEN
                INSERT (
                    EmpleadoId, Fecha, HoraEntrada, HoraSalida, 
                    EstatusChecadorId, HorarioId, 
                    Estado, VentanaInicio, VentanaFin,
                    FechaModificacion
                )
                VALUES (
                    Source.EmpleadoId, Source.Fecha, Source.Checada_Entrada, Source.Checada_Salida, 
                    Source.EstatusCalculadoId, Source.HorarioId, 
                    Source.EstadoCalculado, Source.Ventana_Inicio, Source.Ventana_Fin,
                    GETDATE()
                );

            COMMIT TRANSACTION;
            SET @Reintentos = @MaxReintentos;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            SET @Reintentos = @Reintentos + 1; 
            IF @Reintentos >= @MaxReintentos BEGIN DROP TABLE #SourceData; THROW; END
            WAITFOR DELAY '00:00:00.200';
        END CATCH
    END

    DROP TABLE #SourceData;
END
GO