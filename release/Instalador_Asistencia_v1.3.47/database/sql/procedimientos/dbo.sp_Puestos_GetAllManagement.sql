-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Puestos_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Puestos_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Puestos_GetAllManagement]
AS
BEGIN
    SET NOCOUNT ON;
    -- Seleccionamos todos los campos necesarios para la p�gina de gesti�n
    SELECT 
        PuestoId,
        CodRef,
        Nombre,
        Activo
    FROM 
        dbo.CatalogoPuestos
    ORDER BY 
        Nombre;
END
GO