USE [CA]
GO
/****** Object:  StoredProcedure [dbo].[sp_Empleados_GetBirthdays]    Script Date: 2026-02-21 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:      Antigravity
-- Create date: 2026-02-21
-- Description: Gets active employees whose birthday falls in the specified months.
--              @Months is a comma-separated string, e.g., '1,2,12'
-- =============================================
CREATE PROCEDURE [dbo].[sp_Empleados_GetBirthdays]
    @Months NVARCHAR(50) -- Example: '1,2,12'
AS
BEGIN
    SET NOCOUNT ON;

    -- We use string split to parse the months
    SELECT 
        EmpleadoId,
        Nombres,
        ApellidoPaterno,
        ApellidoMaterno,
        FechaNacimiento,
        DAY(FechaNacimiento) AS DiaNacimiento,
        MONTH(FechaNacimiento) AS MesNacimiento
    FROM 
        dbo.Empleados
    WHERE 
        Activo = 1 
        AND FechaNacimiento IS NOT NULL
        AND MONTH(FechaNacimiento) IN (
            SELECT CAST(value AS INT) 
            FROM STRING_SPLIT(@Months, ',')
        )
    ORDER BY 
        MesNacimiento ASC,
        DiaNacimiento ASC,
        Nombres ASC;
END
GO
