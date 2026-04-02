-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_CatalogoHorarios_GetForManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
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