-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Establecimientos_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Establecimientos_GetAllManagement]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        EstablecimientoId,
        CodRef,
        Nombre,
        Abreviatura,
        Activo
    FROM 
        dbo.CatalogoEstablecimientos
    ORDER BY 
        Nombre;
END
GO