-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_EventosCalendario_Delete]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
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