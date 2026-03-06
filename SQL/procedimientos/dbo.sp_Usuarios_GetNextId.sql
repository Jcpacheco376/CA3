-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuarios_GetNextId]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Usuarios_GetNextId
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ISNULL(MAX(UsuarioId), 0) + 1 AS NextUsuarioId FROM dbo.Usuarios;
END
GO