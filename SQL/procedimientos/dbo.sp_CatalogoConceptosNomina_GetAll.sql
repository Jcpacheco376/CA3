-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoConceptosNomina_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_CatalogoConceptosNomina_GetAll]
AS
BEGIN
    SELECT ConceptoId, Nombre,Abreviatura, CodRef, Activo 
    FROM CatalogoConceptosNomina 
    WHERE Activo = 1 
    ORDER BY Nombre;
END
GO