-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoProcesosAutomaticos_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_CatalogoProcesosAutomaticos_GetAll]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        ProcesoId,
        Nombre,
        KeyInterna,
        Descripcion,
        CronExpression,
        Activo,
        UltimaEjecucion,
        UltimoEstatus
    FROM 
        dbo.CatalogoProcesosAutomaticos
    ORDER BY Nombre ASC;
END
GO