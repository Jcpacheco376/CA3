-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetBirthdays]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetBirthdays]
    @Months NVARCHAR(50) -- Example: '1,2,12'
AS
BEGIN
    SET NOCOUNT ON;

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