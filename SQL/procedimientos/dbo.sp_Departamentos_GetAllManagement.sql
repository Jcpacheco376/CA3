-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Departamentos_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE dbo.sp_Departamentos_GetAllManagement
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DepartamentoId, CodRef, Nombre, Abreviatura, Activo
    FROM dbo.CatalogoDepartamentos;
END
GO