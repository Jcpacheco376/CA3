IF OBJECT_ID('dbo.sp_CatalogoHorarios_GetForManagement') IS NOT NULL      DROP PROCEDURE dbo.sp_CatalogoHorarios_GetForManagement;
GO

CREATE PROCEDURE [dbo].[sp_CatalogoHorarios_GetForManagement]
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


