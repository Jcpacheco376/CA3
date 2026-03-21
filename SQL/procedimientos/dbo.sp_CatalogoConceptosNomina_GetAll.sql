-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoConceptosNomina_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_CatalogoConceptosNomina_GetAll]
AS
BEGIN
    SELECT ConceptoId, Nombre,Abreviatura, CodRef, Activo 
    FROM CatalogoConceptosNomina 
    WHERE Activo = 1 
    ORDER BY Nombre;
END
GO