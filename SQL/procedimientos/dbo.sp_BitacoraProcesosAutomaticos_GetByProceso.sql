-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_BitacoraProcesosAutomaticos_GetByProceso]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_BitacoraProcesosAutomaticos_GetByProceso]
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