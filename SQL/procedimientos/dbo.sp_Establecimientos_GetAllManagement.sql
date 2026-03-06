-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Establecimientos_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Establecimientos_GetAllManagement]
AS
BEGIN
    SET NOCOUNT ON;
    -- Seleccionamos todos los campos necesarios para la p�gina de gesti�n
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