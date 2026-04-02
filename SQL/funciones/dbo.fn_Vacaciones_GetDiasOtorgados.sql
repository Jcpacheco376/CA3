-- ──────────────────────────────────────────────────────────────────────
-- Función: [dbo].[fn_Vacaciones_GetDiasOtorgados]
-- Base de Datos:       CA
-- Sistema:             CA3 Control de Asistencia
-- Descripción:         Fuente de verdad única para calcular cuántos días
--                      de vacaciones le corresponden a un empleado.
--                      Determina el esquema vigente leyendo FechaVigencia
--                      de CatalogoReglasVacaciones — sin hardcodear nombres.
--
-- Regla de negocio:
--   Las vacaciones se otorgan al COMPLETAR el periodo de aniversario.
--   El esquema aplica cuando: FechaFinPeriodo > FechaVigencia del esquema.
--   Se toma el esquema cuya FechaVigencia sea la más reciente que sea
--   estrictamente MENOR a FechaFinPeriodo (es decir, que ya haya entrado
--   en vigor antes de que el periodo finalice).
--
-- Parámetros:
--   @FechaFinPeriodo  DATE  El último día del periodo de aniversario.
--   @AnioAntiguedad   INT   El número de año (1, 2, 3, ...).
--
-- Retorna:
--   INT  Días de vacaciones otorgados según el esquema vigente.
--        Si no existe regla para ese año, retorna 12 como fallback.
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER FUNCTION [dbo].[fn_Vacaciones_GetDiasOtorgados](
    @FechaFinPeriodo DATE,
    @AnioAntiguedad  INT
)
RETURNS INT
AS
BEGIN
    DECLARE @DiasOtorgados INT = NULL;

    -- Seleccionar el esquema cuya FechaVigencia es la más reciente que sea
    -- estrictamente menor a FechaFinPeriodo (ya vigente cuando se completa el periodo).
    SELECT TOP 1 @DiasOtorgados = DiasOtorgados
    FROM dbo.CatalogoReglasVacaciones
    WHERE AniosAntiguedad = @AnioAntiguedad
      AND FechaVigencia < @FechaFinPeriodo
    ORDER BY FechaVigencia DESC;

    -- Fallback: 12 (Regla general por ley si no se encuentra el año específico en el catálogo)
    RETURN ISNULL(@DiasOtorgados, 12);
END
GO
