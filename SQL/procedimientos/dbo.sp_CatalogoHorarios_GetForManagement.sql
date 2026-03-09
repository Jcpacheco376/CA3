-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoHorarios_GetForManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_CatalogoHorarios_GetForManagement]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        h.HorarioId,
        h.Abreviatura,
		h.CodRef,
        h.Nombre,
        h.MinutosTolerancia,
        h.ColorUI,
        h.Activo,
		h.esRotativo,
        (SELECT 
            hd.DiaSemana, hd.EsDiaLaboral, hd.HoraEntrada, hd.HoraSalida, hd.HoraInicioComida, hd.HoraFinComida
         FROM dbo.CatalogoHorariosDetalle hd 
         WHERE hd.HorarioId = h.HorarioId FOR JSON PATH) AS Detalles
    FROM dbo.CatalogoHorarios h
    ORDER BY h.Nombre;
END
GO