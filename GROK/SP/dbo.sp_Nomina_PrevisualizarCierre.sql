IF OBJECT_ID('dbo.sp_Nomina_PrevisualizarCierre') IS NOT NULL      DROP PROCEDURE dbo.sp_Nomina_PrevisualizarCierre;
GO
CREATE   PROCEDURE [dbo].[sp_Nomina_PrevisualizarCierre]
    @GrupoNominaId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @DepartamentoIds NVARCHAR(MAX) = '[]',
    @PuestoIds NVARCHAR(MAX) = '[]',
    @EstablecimientoIds NVARCHAR(MAX) = '[]',
    @UsuarioId INT  
AS
BEGIN
    SET NOCOUNT ON;

    -- Tablas de filtros
    DECLARE @Deptos TABLE (Id INT);
    DECLARE @Puestos TABLE (Id INT);
    DECLARE @Estabs TABLE (Id INT);

    IF ISJSON(@DepartamentoIds) = 1 AND @DepartamentoIds <> '[]'
        INSERT INTO @Deptos SELECT value FROM OPENJSON(@DepartamentoIds);

    IF ISJSON(@PuestoIds) = 1 AND @PuestoIds <> '[]'
        INSERT INTO @Puestos SELECT value FROM OPENJSON(@PuestoIds);

    IF ISJSON(@EstablecimientoIds) = 1 AND @EstablecimientoIds <> '[]'
        INSERT INTO @Estabs SELECT value FROM OPENJSON(@EstablecimientoIds);

    -- 1. Resumen FILTRADO (lo que ve el usuario con sus filtros + permisos)
    SELECT
        COUNT(f.FichaId) AS TotalFichas,
        SUM(CASE WHEN f.Estado = 'VALIDADO'
                 AND f.IncidenciaActivaId IS NULL
                 AND f.EstatusChecadorId IS NOT NULL
                 AND f.EstatusManualId IS NOT NULL
            THEN 1 ELSE 0 END) AS ListasParaCierre,
        SUM(CASE WHEN f.IncidenciaActivaId IS NOT NULL THEN 1 ELSE 0 END) AS PendientesIncidencia,
        SUM(CASE WHEN (f.Estado != 'VALIDADO' AND f.Estado != 'BLOQUEADO')
                 OR (f.EstatusChecadorId IS NULL OR f.EstatusManualId IS NULL)
            THEN 1 ELSE 0 END) AS PendientesValidacion,
        SUM(CASE WHEN f.Estado = 'BLOQUEADO' THEN 1 ELSE 0 END) AS YaBloqueadas
    INTO #ResumenFiltrado
    FROM [dbo].[FichaAsistencia] f
    INNER JOIN [dbo].[Empleados] e ON f.EmpleadoId = e.EmpleadoId
    INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
    WHERE e.GrupoNominaId = @GrupoNominaId
      AND f.Fecha BETWEEN @FechaInicio AND @FechaFin
      AND ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
      AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
      AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs));

    -- 2. Resumen del GRUPO COMPLETO (solo grupo + permisos del usuario)
    SELECT
        COUNT(f.FichaId) AS TotalFichasGrupo,
        SUM(CASE WHEN f.Estado = 'VALIDADO'
                 AND f.IncidenciaActivaId IS NULL
                 AND f.EstatusChecadorId IS NOT NULL
                 AND f.EstatusManualId IS NOT NULL
            THEN 1 ELSE 0 END) AS ListasParaCierreGrupo,
        SUM(CASE WHEN f.IncidenciaActivaId IS NOT NULL THEN 1 ELSE 0 END) AS PendientesIncidenciaGrupo,
        SUM(CASE WHEN (f.Estado != 'VALIDADO' AND f.Estado != 'BLOQUEADO')
                 OR (f.EstatusChecadorId IS NULL OR f.EstatusManualId IS NULL)
            THEN 1 ELSE 0 END) AS PendientesValidacionGrupo,
        SUM(CASE WHEN f.Estado = 'BLOQUEADO' THEN 1 ELSE 0 END) AS YaBloqueadasGrupo
    INTO #ResumenGrupo
    FROM [dbo].[FichaAsistencia] f
    INNER JOIN [dbo].[Empleados] e ON f.EmpleadoId = e.EmpleadoId
    INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
    WHERE e.GrupoNominaId = @GrupoNominaId
      AND f.Fecha BETWEEN @FechaInicio AND @FechaFin;

    -- 3. Resultado final: combinar ambos resúmenes
    SELECT 
        ISNULL(f.TotalFichas, 0) AS TotalFichas,
        ISNULL(f.ListasParaCierre, 0) AS ListasParaCierre,
        ISNULL(f.PendientesIncidencia, 0) AS PendientesIncidencia,
        ISNULL(f.PendientesValidacion, 0) AS PendientesValidacion,
        ISNULL(f.YaBloqueadas, 0) AS YaBloqueadas,
        g.TotalFichasGrupo,
        g.ListasParaCierreGrupo,
        g.PendientesIncidenciaGrupo,
        g.PendientesValidacionGrupo,
        g.YaBloqueadasGrupo
    FROM #ResumenFiltrado f
    FULL OUTER JOIN #ResumenGrupo g ON 1=1;  -- Siempre una fila

    DROP TABLE #ResumenFiltrado;
    DROP TABLE #ResumenGrupo;
END


