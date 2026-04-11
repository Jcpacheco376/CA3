-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Job_GeneracionDiaria_Asistencia]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Job_GeneracionDiaria_Asistencia]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Ayer DATE = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE);
    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);

    -- 1. PROCESAR AYER
    PRINT 'Procesando cierre de: ' + CONVERT(VARCHAR, @Ayer);
    EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] 
        @FechaInicio = @Ayer, 
        @FechaFin = @Ayer,
        @UsuarioId = 0; 

    -- 2. PROCESAR HOY (Inicializaci�n / Tiempo Real)
    PRINT 'Inicializando d�a: ' + CONVERT(VARCHAR, @Hoy);
    EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] 
        @FechaInicio = @Hoy, 
        @FechaFin = @Hoy,
        @UsuarioId = 0;
        
    PRINT 'Job completado con �xito.';
END
GO