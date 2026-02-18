IF OBJECT_ID('dbo.sp_Job_GeneracionDiaria_Asistencia') IS NOT NULL      DROP PROCEDURE dbo.sp_Job_GeneracionDiaria_Asistencia;
GO
CREATE   PROCEDURE [dbo].[sp_Job_GeneracionDiaria_Asistencia]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Ayer DATE = CAST(DATEADD(DAY, -1, GETDATE()) AS DATE);
    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);

    -- 1. PROCESAR AYER (Cierre definitivo)
    -- Esto recalcula ayer para atrapar a los que salieron muy tarde (después del último check manual)
    -- y marca las Faltas definitivas de ayer.
    PRINT 'Procesando cierre de: ' + CONVERT(VARCHAR, @Ayer);
    EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] 
        @FechaInicio = @Ayer, 
        @FechaFin = @Ayer,
        @UsuarioId = 0; -- 0 o NULL indica "Sistema"

    -- 2. PROCESAR HOY (Inicialización / Tiempo Real)
    -- Esto genera las fichas de hoy. Si alguien ya checó entrada, aparecerá.
    -- Si no han checado, aparecerán como Falta (temporalmente) hasta que chequen.
    PRINT 'Inicializando día: ' + CONVERT(VARCHAR, @Hoy);
    EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] 
        @FechaInicio = @Hoy, 
        @FechaFin = @Hoy,
        @UsuarioId = 0;
        
    PRINT 'Job completado con éxito.';
END

