CREATE PROCEDURE [dbo].[sp_BitacoraProcesosAutomaticos_GetByProceso]
    @ProcesoId INT,
    @Top INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@Top)
        B.BitacoraId,
        B.ProcesoId,
        B.FechaHoraInicio,
        B.FechaHoraFin,
        B.Estatus,
        B.MensajeLog
    FROM 
        dbo.BitacoraProcesosAutomaticos B
    WHERE 
        B.ProcesoId = @ProcesoId
    ORDER BY 
        B.FechaHoraInicio DESC;
END
GO
