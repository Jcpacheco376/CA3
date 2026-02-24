USE [CA]
GO
/****** Object:  StoredProcedure [dbo].[sp_Empleados_GetAnniversaries]    Script Date: 2026-02-24 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Antigravity
-- Create date: 2026-02-24
-- Description: Gets active employees whose work anniversary falls in the specified months.
--              @Months is a comma-separated string, e.g., '1,2,12'
-- =============================================
CREATE PROCEDURE [dbo].[sp_Empleados_GetAnniversaries]
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
