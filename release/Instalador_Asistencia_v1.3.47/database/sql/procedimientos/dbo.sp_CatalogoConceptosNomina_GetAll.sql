-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoConceptosNomina_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoConceptosNomina_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
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