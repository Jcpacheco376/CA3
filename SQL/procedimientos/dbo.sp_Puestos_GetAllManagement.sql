-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Puestos_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Puestos_GetAllManagement]
AS
BEGIN
    SET NOCOUNT ON;
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