-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetBirthdays]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetBirthdays]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetBirthdays]
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