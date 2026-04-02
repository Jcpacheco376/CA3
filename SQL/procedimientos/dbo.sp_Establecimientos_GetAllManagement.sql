-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Establecimientos_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
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