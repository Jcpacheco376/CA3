-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Horarios_ValidarSolapamiento]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Horarios_ValidarSolapamiento]
    @EmpleadoId INT,
    @Fecha DATE,
    @NuevoHorarioId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Obtener la ventana del nuevo horario propuesto
    DECLARE @NuevoInicio DATETIME, @NuevoFin DATETIME;
    DECLARE @DiaSemana INT = DATEPART(WEEKDAY, @Fecha);

    SELECT 
        @NuevoInicio = DATEADD(MINUTE, -ISNULL(MinutosAntesEntrada, 120), CAST(@Fecha AS DATETIME) + CAST(HoraEntrada AS DATETIME)),
        @NuevoFin = DATEADD(MINUTE, ISNULL(MinutosDespuesSalida, 240), 
            CASE WHEN HoraSalida < HoraEntrada THEN CAST(DATEADD(DAY, 1, @Fecha) AS DATETIME) + CAST(HoraSalida AS DATETIME)
            ELSE CAST(@Fecha AS DATETIME) + CAST(HoraSalida AS DATETIME) END
        )
    FROM dbo.CatalogoHorariosDetalle
    WHERE HorarioId = @NuevoHorarioId AND DiaSemana = @DiaSemana;

    IF @NuevoInicio IS NULL RETURN; -- No hay horario ese d�a, no hay conflicto.

    -- 2. Buscar conflictos con fichas YA existentes (calculadas)
    -- Si ya existe una ficha cuya ventana se traslape con la propuesta
    IF EXISTS (
        SELECT 1 FROM dbo.FichaAsistencia
        WHERE EmpleadoId = @EmpleadoId
          AND Fecha <> @Fecha -- Ignorar el mismo d�a si estamos reemplazando
          AND VentanaInicio IS NOT NULL
          AND (
              (@NuevoInicio BETWEEN VentanaInicio AND VentanaFin) OR
              (@NuevoFin BETWEEN VentanaInicio AND VentanaFin) OR
              (VentanaInicio BETWEEN @NuevoInicio AND @NuevoFin)
          )
    )
    BEGIN
        RAISERROR ('El horario asignado provoca un solapamiento con un turno adyacente existente.', 16, 1);
    END
END
GO