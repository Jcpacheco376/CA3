-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetAnniversaries]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetAnniversaries]
    @Months NVARCHAR(50) -- Example: '1,2,12'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        EmpleadoId,
        Nombres,
        ApellidoPaterno,
        ApellidoMaterno,
        FechaIngreso,
        DAY(FechaIngreso) AS DiaAniversario,
        MONTH(FechaIngreso) AS MesAniversario,
        YEAR(GETDATE()) - YEAR(FechaIngreso) AS AniosServicio
    FROM 
        dbo.Empleados
    WHERE 
        Activo = 1 
        AND FechaIngreso IS NOT NULL
        AND MONTH(FechaIngreso) IN (
            SELECT CAST(value AS INT) 
            FROM STRING_SPLIT(@Months, ',')
        )
        -- Only show anniversaries of at least 1 year
        AND (YEAR(GETDATE()) - YEAR(FechaIngreso)) > 0
    ORDER BY 
        MesAniversario ASC,
        DiaAniversario ASC,
        Nombres ASC;
END
GO