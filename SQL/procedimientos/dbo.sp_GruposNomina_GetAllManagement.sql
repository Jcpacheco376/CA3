-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_GruposNomina_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE dbo.sp_GruposNomina_GetAllManagement
AS
BEGIN
    SET NOCOUNT ON;
    SELECT GrupoNominaId, CodRef, Nombre, Abreviatura, Activo
    FROM dbo.CatalogoGruposNomina;
END
GO