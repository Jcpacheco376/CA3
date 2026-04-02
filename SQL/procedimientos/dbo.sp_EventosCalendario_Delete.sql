-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_EventosCalendario_Delete]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_EventosCalendario_Delete]
    @EventoId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.EventosCalendario
    WHERE EventoId = @EventoId;
END
GO