-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Puestos_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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