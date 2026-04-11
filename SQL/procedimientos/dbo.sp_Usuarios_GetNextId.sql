-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuarios_GetNextId]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Usuarios_GetNextId
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ISNULL(MAX(UsuarioId), 0) + 1 AS NextUsuarioId FROM dbo.Usuarios;
END
GO