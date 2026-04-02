-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_GruposNomina_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE dbo.sp_GruposNomina_GetAllManagement
AS
BEGIN
    SET NOCOUNT ON;
    SELECT GrupoNominaId, CodRef, Nombre, Abreviatura, Activo
    FROM dbo.CatalogoGruposNomina;
END
GO