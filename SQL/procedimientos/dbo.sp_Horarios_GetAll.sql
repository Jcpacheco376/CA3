-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Horarios_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

/*
Este SP corrige el 'sp_Horarios_GetAll'
Se elimina la referencia a la columna 'Activo'
en la tabla de detalles, ya que fue eliminada.
*/
CREATE OR ALTER PROCEDURE [dbo].[sp_Horarios_GetAll]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        h.HorarioId, 
        h.Abreviatura, 
        h.Nombre, 
        h.ColorUI, 
        h.EsRotativo, 
        h.turno,
        (
            SELECT 
                d.HorarioDetalleId,
                d.DiaSemana,
                d.EsDiaLaboral,
                d.HoraEntrada,
                d.HoraSalida,
                d.HoraInicioComida,
                d.HoraFinComida,
                CASE 
                    WHEN d.HoraInicioComida IS NOT NULL AND d.HoraInicioComida <> '00:00:00' 
                    THEN 1 
                    ELSE 0 
                END AS TieneComida
            FROM dbo.CatalogoHorariosDetalle d
            WHERE d.HorarioId = h.HorarioId
            -- AND d.Activo = 1 -- �FIX! Se elimina esta l�nea
            FOR JSON PATH
        ) AS Turnos
    FROM dbo.CatalogoHorarios h
    WHERE h.Activo = 1 
    ORDER BY h.Nombre;
END
GO