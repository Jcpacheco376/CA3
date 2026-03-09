-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoConceptosNomina_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
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