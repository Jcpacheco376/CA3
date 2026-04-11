CREATE PROCEDURE [dbo].[sp_BitacoraProcesosAutomaticos_LogEnd]
    @BitacoraId INT,
    @Estatus NVARCHAR(50),
    @MensajeLog NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE dbo.BitacoraProcesosAutomaticos
    SET 
        FechaHoraFin = GETDATE(),
        Estatus = @Estatus,
        MensajeLog = CASE WHEN @MensajeLog IS NOT NULL THEN MensajeLog + CHAR(13) + CHAR(10) + @MensajeLog ELSE MensajeLog END
    WHERE BitacoraId = @BitacoraId;

    -- Update parent process last status
    DECLARE @ProcesoId INT;
    SELECT @ProcesoId = ProcesoId FROM dbo.BitacoraProcesosAutomaticos WHERE BitacoraId = @BitacoraId;
    
    IF @ProcesoId IS NOT NULL
    BEGIN
        UPDATE dbo.CatalogoProcesosAutomaticos
        SET UltimoEstatus = @Estatus
        WHERE ProcesoId = @ProcesoId;
    END
END
GO
