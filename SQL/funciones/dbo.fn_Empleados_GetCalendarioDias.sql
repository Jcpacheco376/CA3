-- ──────────────────────────────────────────────────────────────────────
-- Función Tabla: [dbo].[fn_Empleados_GetCalendarioDias]
-- Base de Datos:       CA
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────
-- Fuente de verdad absoluta para determinar el tipo de cada día
-- (LABORAL, DESCANSO, FERIADO, SIN_HORARIO) para un empleado en un rango.
--
-- Usa EXACTAMENTE la misma lógica de resolución de horarios que
-- sp_FichasAsistencia_ProcesarChecadas (la referencia canónica):
--   1. HorariosTemporales tiene prioridad absoluta
--      - TipoAsignacion = 'D' → descanso explícito
--      - TipoAsignacion = 'H' → usa HorarioId con DiaSemana (no rotativo) o HorarioDetalleId (rotativo)
--      - TipoAsignacion = 'T' → usa HorarioDetalleId directo (turno específico)
--   2. Si no hay temporal → horario base del empleado
--      - Si no tiene base o es rotativo → SIN_HORARIO
--   3. EventosCalendario (DIA_FERIADO) → sobreescribe LABORAL a FERIADO
--
-- Se puede usar directamente en cualquier consulta:
--   SELECT * FROM dbo.fn_Empleados_GetCalendarioDias(445, '2026-04-01', '2026-04-30')
-- ──────────────────────────────────────────────────────────────────────

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
    -- NOTA: No se puede usar SET DATEFIRST dentro de una función.
    -- Usamos fórmula determinista: ((DATEPART(dw, @Fecha) + @@DATEFIRST - 2) % 7) + 1
    -- Esto siempre da 1=Lun ... 7=Dom sin importar DATEFIRST del servidor.

    -- ── 1. Datos del empleado ──────────────────────────────────────────
    DECLARE @HorarioBaseId  INT;
    DECLARE @BaseEsRotativo BIT;

    SELECT
        @HorarioBaseId  = e.HorarioIdPredeterminado,
        @BaseEsRotativo = ISNULL(h.EsRotativo, 0)
    FROM dbo.Empleados e
    LEFT JOIN dbo.CatalogoHorarios h ON h.HorarioId = e.HorarioIdPredeterminado
    WHERE e.EmpleadoId = @EmpleadoId;

    -- ── 2. Iteración día a día ─────────────────────────────────────────
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

        -- ── 2a. Buscar en HorariosTemporales (prioridad máxima) ────────
        SELECT TOP 1
            @HorarioIdDia   = ht.HorarioId,
            @HorarioDetId   = ht.HorarioDetalleId,
            @TipoAsignacion = ht.TipoAsignacion
        FROM dbo.HorariosTemporales ht
        WHERE ht.EmpleadoId = @EmpleadoId
          AND ht.Fecha = @FechaActual;

        IF @TipoAsignacion IS NOT NULL
        BEGIN
            -- ── 'D' = Descanso explícito ───────────────────────────────
            IF @TipoAsignacion = 'D'
            BEGIN
                SET @TipoDiaFinal = 'DESCANSO';
                SET @OrigenFinal  = 'TEMPORAL_D';
            END
            -- ── 'T' = Turno específico (usa HorarioDetalleId directo) ──
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
            -- ── 'H' = Horario completo asignado ────────────────────────
            ELSE IF @TipoAsignacion = 'H' AND @HorarioIdDia IS NOT NULL
            BEGIN
                SET @OrigenFinal = 'TEMPORAL_H';
                -- Verificar si ESTE horario asignado es rotativo
                SELECT @EsRotativoDia = ISNULL(h.EsRotativo, 0)
                FROM dbo.CatalogoHorarios h
                WHERE h.HorarioId = @HorarioIdDia;

                IF @EsRotativoDia = 1
                BEGIN
                    -- Rotativo con HorarioDetalleId → buscar el detalle exacto
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
                        -- Rotativo SIN detalle puntual → no sabemos
                        SET @TipoDiaFinal = 'SIN_HORARIO';
                    END
                END
                ELSE
                BEGIN
                    -- No rotativo → buscar por DiaSemana en su detalle
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
                -- TipoAsignacion presente pero sin datos válidos
                SET @TipoDiaFinal = 'SIN_HORARIO';
            END
        END
        ELSE
        BEGIN
            -- ── 2b. Sin horario temporal → usar horario base ───────────
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

        -- ── 3. Feriado (solo sobreescribe día LABORAL) ─────────────────
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

        -- ── 4. Insertar resultado ──────────────────────────────────────
        INSERT INTO @Result (Fecha, TipoDia, OrigenHorario)
        VALUES (@FechaActual, @TipoDiaFinal, @OrigenFinal);

        SET @FechaActual = DATEADD(DAY, 1, @FechaActual);
    END

    RETURN;
END
GO
