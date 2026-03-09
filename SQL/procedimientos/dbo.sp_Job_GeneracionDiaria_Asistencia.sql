-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Job_GeneracionDiaria_Asistencia]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Job_GeneracionDiaria_Asistencia]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Ayer DATE = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE);
    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);

    -- 1. PROCESAR AYER (Cierre definitivo)
    -- Esto recalcula ayer para atrapar a los que salieron muy tarde (despu�s del �ltimo check manual)
    -- y marca las Faltas definitivas de ayer.
    PRINT 'Procesando cierre de: ' + CONVERT(VARCHAR, @Ayer);
    EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] 
        @FechaInicio = @Ayer, 
        @FechaFin = @Ayer,
        @UsuarioId = 0; -- 0 o NULL indica "Sistema"

    -- 2. PROCESAR HOY (Inicializaci�n / Tiempo Real)
    -- Esto genera las fichas de hoy. Si alguien ya chec� entrada, aparecer�.
    -- Si no han checado, aparecer�n como Falta (temporalmente) hasta que chequen.
    PRINT 'Inicializando d�a: ' + CONVERT(VARCHAR, @Hoy);
    EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] 
        @FechaInicio = @Hoy, 
        @FechaFin = @Hoy,
        @UsuarioId = 0;
        
    PRINT 'Job completado con �xito.';
END
GO