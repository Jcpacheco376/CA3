-- ─── Cleanup duplicates in VacacionesSaldos ──────────────────────────────
-- Keep only the record with the most populated dates or higher SaldoId
WITH CTE AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY EmpleadoId, Anio 
               ORDER BY CASE WHEN FechaInicioPeriodo IS NOT NULL THEN 1 ELSE 0 END DESC, 
                        SaldoId DESC
           ) as rn
    FROM VacacionesSaldos
)
DELETE FROM CTE WHERE rn > 1;

-- Add Unique Constraint to prevent future duplicates
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_VacacionesSaldos_EmpleadoAnio' AND object_id = OBJECT_ID('dbo.VacacionesSaldos'))
BEGIN
    ALTER TABLE [dbo].[VacacionesSaldos] 
    ADD CONSTRAINT [UQ_VacacionesSaldos_EmpleadoAnio] UNIQUE ([EmpleadoId], [Anio]);
END
GO

-- Fix the Computed/Update logic in sp_Vacaciones_GenerarSaldosBase (will be applied in the SP update)
