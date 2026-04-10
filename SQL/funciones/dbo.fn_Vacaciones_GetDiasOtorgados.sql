-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[fn_Vacaciones_GetDiasOtorgados]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER FUNCTION [dbo].[fn_Vacaciones_GetDiasOtorgados](
    @FechaFinPeriodo DATE,
    @AnioAntiguedad  INT
)
RETURNS INT
AS
BEGIN
    DECLARE @DiasOtorgados INT = NULL;

    -- 1. Intento normal: Regla vigente antes del fin del periodo
    SELECT TOP 1 @DiasOtorgados = DiasOtorgados
    FROM dbo.CatalogoReglasVacaciones
    WHERE AniosAntiguedad = @AnioAntiguedad
      AND FechaVigencia <= @FechaFinPeriodo
    ORDER BY FechaVigencia DESC;

    -- 2. Fallback: Si es un periodo a futuro y no hay regla específica aún,
    --    tomar la regla más vigente al día de hoy para ese aniversario.
    IF @DiasOtorgados IS NULL
    BEGIN
        SELECT TOP 1 @DiasOtorgados = DiasOtorgados
        FROM dbo.CatalogoReglasVacaciones
        WHERE AniosAntiguedad = @AnioAntiguedad
        ORDER BY FechaVigencia DESC;
    END

    -- Fallback final: 0 si de plano no hay reglas configuradas para ese aniversario.
    RETURN ISNULL(@DiasOtorgados, 0);
END
GO