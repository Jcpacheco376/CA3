-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoEstatusAsistencia_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_CatalogoEstatusAsistencia_GetAllManagement
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM dbo.CatalogoEstatusAsistencia ORDER BY EstatusId;
END
GO