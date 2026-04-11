-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_BitacoraProcesosAutomaticos_LogStart]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_BitacoraProcesosAutomaticos_LogStart]
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