-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_GruposNomina_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
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