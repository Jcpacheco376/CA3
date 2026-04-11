-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[fn_Empleados_GetCalendarioDias]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER FUNCTION [dbo].[fn_Empleados_GetCalendarioDias]
(
    @EmpleadoId  INT,
    @FechaInicio DATE,
    @FechaFin    DATE
)
RETURNS @Result TABLE
(
    Fecha          DATE         NOT NULL,
    TipoDia        VARCHAR(20)  NOT NULL,  -- LABORAL, DESCANSO, FERIADO, SIN_HORARIO
    OrigenHorario  VARCHAR(20)  NOT NULL   -- BASE, TEMPORAL_H, TEMPORAL_T, TEMPORAL_D, NINGUNO
)
AS
BEGIN
    -- NOTA: No se puede usar SET DATEFIRST dentro de una funciÃ³n.
    -- Usamos fÃ³rmula determinista: ((DATEPART(dw, @Fecha) + @@DATEFIRST - 2) % 7) + 1
    -- Esto siempre da 1=Lun ... 7=Dom sin importar DATEFIRST del servidor.

    -- â”€â”€ 1. Datos del empleado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    DECLARE @HorarioBaseId  INT;
    DECLARE @BaseEsRotativo BIT;

    SELECT
        @HorarioBaseId  = e.HorarioIdPredeterminado,
        @BaseEsRotativo = ISNULL(h.EsRotativo, 0)
    FROM dbo.Empleados e
    LEFT JOIN dbo.CatalogoHorarios h ON h.HorarioId = e.HorarioIdPredeterminado
    WHERE e.EmpleadoId = @EmpleadoId;

    -- â”€â”€ 2. IteraciÃ³n dÃ­a a dÃ­a â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    DECLARE @FechaActual    DATE = @FechaInicio;
    DECLARE @ConvDiaSemana  INT;      -- 1=Lun ... 7=Dom (determinista)
    DECLARE @HorarioIdDia   INT;
    DECLARE @HorarioDetId   INT;
    DECLARE @TipoAsignacion CHAR(1);
    DECLARE @EsDiaLaboral   BIT;
    DECLARE @EsRotativoDia  BIT;
    DECLARE @TipoDiaFinal   VARCHAR(20);
    DECLARE @OrigenFinal    VARCHAR(20);

    WHILE @FechaActual <= @FechaFin
    BEGIN
        SET @ConvDiaSemana  = ((DATEPART(dw, @FechaActual) + @@DATEFIRST - 2) % 7) + 1; -- 1=Lun ... 7=Dom
        SET @HorarioIdDia   = NULL;
        SET @HorarioDetId   = NULL;
        SET @TipoAsignacion = NULL;
        SET @EsDiaLaboral   = NULL;
        SET @EsRotativoDia  = NULL;
        SET @TipoDiaFinal   = NULL;
        SET @OrigenFinal    = 'NINGUNO';

        -- â”€â”€ 2a. Buscar en HorariosTemporales (prioridad mÃ¡xima) â”€â”€â”€â”€â”€â”€â”€â”€
        SELECT TOP 1
            @HorarioIdDia   = ht.HorarioId,
            @HorarioDetId   = ht.HorarioDetalleId,
            @TipoAsignacion = ht.TipoAsignacion
        FROM dbo.HorariosTemporales ht
        WHERE ht.EmpleadoId = @EmpleadoId
          AND ht.Fecha = @FechaActual;

        IF @TipoAsignacion IS NOT NULL
        BEGIN
            -- â”€â”€ 'D' = Descanso explÃ­cito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            IF @TipoAsignacion = 'D'
            BEGIN
                SET @TipoDiaFinal = 'DESCANSO';
                SET @OrigenFinal  = 'TEMPORAL_D';
            END
            -- â”€â”€ 'T' = Turno especÃ­fico (usa HorarioDetalleId directo) â”€â”€
            ELSE IF @TipoAsignacion = 'T' AND @HorarioDetId IS NOT NULL
            BEGIN
                SET @OrigenFinal = 'TEMPORAL_T';
                -- Obtener EsDiaLaboral desde el detalle puntual
                SELECT @EsDiaLaboral = hd.EsDiaLaboral
                FROM dbo.CatalogoHorariosDetalle hd
                WHERE hd.HorarioDetalleId = @HorarioDetId;

                IF @EsDiaLaboral IS NULL SET @EsDiaLaboral = 1;
                SET @TipoDiaFinal = CASE WHEN @EsDiaLaboral = 1 THEN 'LABORAL' ELSE 'DESCANSO' END;
            END
            -- â”€â”€ 'H' = Horario completo asignado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            ELSE IF @TipoAsignacion = 'H' AND @HorarioIdDia IS NOT NULL
            BEGIN
                SET @OrigenFinal = 'TEMPORAL_H';
                -- Verificar si ESTE horario asignado es rotativo
                SELECT @EsRotativoDia = ISNULL(h.EsRotativo, 0)
                FROM dbo.CatalogoHorarios h
                WHERE h.HorarioId = @HorarioIdDia;

                IF @EsRotativoDia = 1
                BEGIN
                    -- Rotativo con HorarioDetalleId â†’ buscar el detalle exacto
                    IF @HorarioDetId IS NOT NULL
                    BEGIN
                        SELECT @EsDiaLaboral = hd.EsDiaLaboral
                        FROM dbo.CatalogoHorariosDetalle hd
                        WHERE hd.HorarioDetalleId = @HorarioDetId;

                        IF @EsDiaLaboral IS NULL SET @EsDiaLaboral = 1;
                        SET @TipoDiaFinal = CASE WHEN @EsDiaLaboral = 1 THEN 'LABORAL' ELSE 'DESCANSO' END;
                    END
                    ELSE
                    BEGIN
                        -- Rotativo SIN detalle puntual â†’ no sabemos
                        SET @TipoDiaFinal = 'SIN_HORARIO';
                    END
                END
                ELSE
                BEGIN
                    -- No rotativo â†’ buscar por DiaSemana en su detalle
                    SELECT TOP 1 @EsDiaLaboral = hd.EsDiaLaboral
                    FROM dbo.CatalogoHorariosDetalle hd
                    WHERE hd.HorarioId = @HorarioIdDia
                      AND hd.DiaSemana = @ConvDiaSemana;

                    IF @EsDiaLaboral IS NULL SET @EsDiaLaboral = 1;
                    SET @TipoDiaFinal = CASE WHEN @EsDiaLaboral = 1 THEN 'LABORAL' ELSE 'DESCANSO' END;
                END
            END
            ELSE
            BEGIN
                -- TipoAsignacion presente pero sin datos vÃ¡lidos
                SET @TipoDiaFinal = 'SIN_HORARIO';
            END
        END
        ELSE
        BEGIN
            -- â”€â”€ 2b. Sin horario temporal â†’ usar horario base â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            IF @HorarioBaseId IS NULL OR @BaseEsRotativo = 1
            BEGIN
                SET @TipoDiaFinal = 'SIN_HORARIO';
                SET @OrigenFinal  = 'NINGUNO';
            END
            ELSE
            BEGIN
                SET @OrigenFinal = 'BASE';
                SELECT TOP 1 @EsDiaLaboral = hd.EsDiaLaboral
                FROM dbo.CatalogoHorariosDetalle hd
                WHERE hd.HorarioId = @HorarioBaseId
                  AND hd.DiaSemana = @ConvDiaSemana;

                IF @EsDiaLaboral IS NULL SET @EsDiaLaboral = 1;
                SET @TipoDiaFinal = CASE WHEN @EsDiaLaboral = 1 THEN 'LABORAL' ELSE 'DESCANSO' END;
            END
        END

        -- â”€â”€ 3. Feriado (solo sobreescribe dÃ­a LABORAL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        IF @TipoDiaFinal = 'LABORAL'
        BEGIN
            IF EXISTS (
                SELECT 1 FROM dbo.EventosCalendario ec
                WHERE ec.Fecha = @FechaActual
                  AND ec.TipoEventoId = 'DIA_FERIADO'
                  AND ec.Activo = 1
            )
            BEGIN
                SET @TipoDiaFinal = 'FERIADO';
            END
        END

        -- â”€â”€ 4. Insertar resultado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        INSERT INTO @Result (Fecha, TipoDia, OrigenHorario)
        VALUES (@FechaActual, @TipoDiaFinal, @OrigenFinal);

        SET @FechaActual = DATEADD(DAY, 1, @FechaActual);
    END

    RETURN;
END
GO