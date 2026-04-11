-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_EventosCalendario_Delete]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_EventosCalendario_Delete]
    @EventoId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.EventosCalendario
    WHERE EventoId = @EventoId;
END
GO