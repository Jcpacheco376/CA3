IF OBJECT_ID('dbo.sp_Nomina_ValidarPeriodo') IS NOT NULL      DROP PROCEDURE dbo.sp_Nomina_ValidarPeriodo;
GO

CREATE PROCEDURE [dbo].[sp_Nomina_ValidarPeriodo]
    @FechaInicio DATE,
    @FechaFin DATE,
    @UsuarioId INT,
    @DepartamentoFiltro NVARCHAR(MAX) = NULL,
    @GrupoNominaFiltro NVARCHAR(MAX) = NULL,
    @PuestoFiltro NVARCHAR(MAX) = NULL,
    @EstablecimientoFiltro NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. GARANTIZAR DATOS
    IF NOT EXISTS (SELECT 1 FROM dbo.FichaAsistencia WHERE Fecha BETWEEN @FechaInicio AND @FechaFin)
    BEGIN
        EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] @FechaInicio, @FechaFin, @UsuarioId;
    END

    -- 2. FILTRADO (Mismo código de siempre...)
    DECLARE @EmpleadosFiltrados TABLE (EmpleadoId INT PRIMARY KEY);
    -- ... (Aquí va todo el bloque de inserción de @EmpleadosFiltrados que ya tienes) ...
    DECLARE @Deptos TABLE (Id INT); IF @DepartamentoFiltro IS NOT NULL AND @DepartamentoFiltro <> '[]' INSERT INTO @Deptos SELECT Id FROM OPENJSON(@DepartamentoFiltro) WITH (Id INT '$');
    DECLARE @Grupos TABLE (Id INT); IF @GrupoNominaFiltro IS NOT NULL AND @GrupoNominaFiltro <> '[]' INSERT INTO @Grupos SELECT Id FROM OPENJSON(@GrupoNominaFiltro) WITH (Id INT '$');
    DECLARE @Puestos TABLE (Id INT); IF @PuestoFiltro IS NOT NULL AND @PuestoFiltro <> '[]' INSERT INTO @Puestos SELECT Id FROM OPENJSON(@PuestoFiltro) WITH (Id INT '$');
    DECLARE @Estabs TABLE (Id INT); IF @EstablecimientoFiltro IS NOT NULL AND @EstablecimientoFiltro <> '[]' INSERT INTO @Estabs SELECT Id FROM OPENJSON(@EstablecimientoFiltro) WITH (Id INT '$');

    INSERT INTO @EmpleadosFiltrados (EmpleadoId)
    SELECT e.EmpleadoId FROM dbo.Empleados e
    INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
    WHERE e.Activo = 1 
      AND ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
      AND ((SELECT COUNT(*) FROM @Grupos) = 0 OR e.GrupoNominaId IN (SELECT Id FROM @Grupos))
      AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
      AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs));


    -- 3. MÉTRICAS BASADAS EN ESTADO
    
    DECLARE @IncidenciasTotal INT, @IncidenciasCriticas INT;
    SELECT @IncidenciasTotal = COUNT(*), @IncidenciasCriticas = SUM(CASE WHEN c.Severidad = 'Critica' THEN 1 ELSE 0 END)
    FROM dbo.Incidencias i JOIN dbo.CatalogoTiposIncidencia c ON i.TipoIncidenciaId = c.TipoIncidenciaId JOIN @EmpleadosFiltrados ef ON i.EmpleadoId = ef.EmpleadoId
    WHERE i.Fecha BETWEEN @FechaInicio AND @FechaFin AND i.Estado IN ('Pendiente', 'Nueva');

    DECLARE @FichasBorrador INT, @FichasSinHorario INT, @TotalFichas INT;
    
    SELECT 
        @TotalFichas = COUNT(*),
        
        -- AHORA VALIDAR ES MÁS FÁCIL: Si está en BORRADOR, falta validar.
        @FichasBorrador = SUM(CASE WHEN f.Estado = 'BORRADOR' THEN 1 ELSE 0 END),
        
        -- Sin Horario (Manteniendo tu lógica de catálogo)
        @FichasSinHorario = SUM(CASE WHEN cea.SinHorario = 1 THEN 1 ELSE 0 END)
    FROM dbo.FichaAsistencia f
    JOIN @EmpleadosFiltrados ef ON f.EmpleadoId = ef.EmpleadoId
    LEFT JOIN dbo.CatalogoEstatusAsistencia cea ON cea.EstatusId = ISNULL(f.EstatusManualId, f.EstatusChecadorId)
    WHERE f.Fecha BETWEEN @FechaInicio AND @FechaFin;

    -- 4. SEMÁFORO
    DECLARE @Semaforo VARCHAR(20) = 'VERDE';
    DECLARE @Msg VARCHAR(255) = 'Periodo listo para procesar.';

    IF @IncidenciasCriticas > 0 BEGIN SET @Semaforo = 'ROJO'; SET @Msg = 'ALERTA: Incidencias críticas pendientes.'; END
    ELSE IF @FichasSinHorario > 0 BEGIN SET @Semaforo = 'AMARILLO'; SET @Msg = 'ATENCIÓN: Registros sin horario.'; END
    ELSE IF @FichasBorrador > 0 BEGIN SET @Semaforo = 'AMARILLO'; SET @Msg = 'ATENCIÓN: Hay ' + CAST(@FichasBorrador AS VARCHAR) + ' fichas en estado BORRADOR.'; END

    -- 5. RETORNO
    SELECT 
        @TotalFichas AS TotalFichas,
        ISNULL(@IncidenciasTotal, 0) AS TotalPendientes,
        ISNULL(@IncidenciasCriticas, 0) AS CriticasPendientes,
        @FichasBorrador AS FichasSinValidar, -- Mapeamos BORRADOR a Sin Validar
        ISNULL(@FichasSinHorario, 0) AS FichasSinHorario,
        @Semaforo AS EstadoSemaforo,
        @Msg AS MensajeValidacion;
END

