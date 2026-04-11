CREATE PROCEDURE [dbo].[sp_BitacoraProcesosAutomaticos_LogStart]
    @KeyInterna NVARCHAR(50),
    @MensajeLog NVARCHAR(MAX) = NULL,
    @BitacoraId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ProcesoId INT;
    
    SELECT @ProcesoId = ProcesoId 
    FROM dbo.CatalogoProcesosAutomaticos 
    WHERE KeyInterna = @KeyInterna;

    IF @ProcesoId IS NULL
    BEGIN
        RAISERROR('No se encontro el proceso con la KeyInterna especificada.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.BitacoraProcesosAutomaticos (
        ProcesoId, FechaHoraInicio, Estatus, MensajeLog
    )
    VALUES (
        @ProcesoId, GETDATE(), 'En Progreso', @MensajeLog
    );
    
    SET @BitacoraId = SCOPE_IDENTITY();
    
    -- Update process status
    UPDATE dbo.CatalogoProcesosAutomaticos
    SET 
        UltimaEjecucion = GETDATE(),
        UltimoEstatus = 'En Progreso'
    WHERE ProcesoId = @ProcesoId;
END
GO
