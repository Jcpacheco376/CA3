IF OBJECT_ID('dbo.sp_HorariosTemporales_GetByPeriodo') IS NOT NULL      DROP PROCEDURE dbo.sp_HorariosTemporales_GetByPeriodo;
GO
CREATE PROCEDURE [dbo].[sp_HorariosTemporales_GetByPeriodo]
    @UsuarioId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @DepartamentoFiltro NVARCHAR(MAX) = '[]',
    @GrupoNominaFiltro NVARCHAR(MAX) = '[]',
    @PuestoFiltro NVARCHAR(MAX) = '[]',
    @EstablecimientoFiltro NVARCHAR(MAX) = '[]'
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. LEER CONFIGURACIÓN DE SEGURIDAD
    DECLARE @SeguridadDepts BIT, @SeguridadGrupos BIT, @SeguridadPuestos BIT, @SeguridadEstabs BIT;
    SELECT 
        @SeguridadDepts = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroDepartamentosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @SeguridadGrupos = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroGruposNominaActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @SeguridadPuestos = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroPuestosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @SeguridadEstabs = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroEstablecimientosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT)
    FROM dbo.ConfiguracionSistema;

    -- ---------------------------------------------------------
    -- CTE: NORMALIZACIÓN DE IDs
    -- ---------------------------------------------------------
    ;WITH EmpleadosNormalizados AS (
        SELECT 
            e.EmpleadoId,
            e.CodRef,
            e.NombreCompleto,
            e.HorarioIdPredeterminado,
            e.FechaNacimiento,
            e.Activo,
            d.DepartamentoId AS Real_DepartamentoId,
            COALESCE(d.Nombre, 'Sin Departamento') AS DepartamentoNombre,
            p.PuestoId AS Real_PuestoId,
            COALESCE(p.Nombre, 'Sin Puesto') AS PuestoNombre,
            g.GrupoNominaId AS Real_GrupoNominaId,
            s.EstablecimientoId AS Real_EstablecimientoId
        FROM dbo.Empleados e
        LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
        LEFT JOIN dbo.CatalogoPuestos p ON e.PuestoId = p.PuestoId
        LEFT JOIN dbo.CatalogoGruposNomina g ON e.GrupoNominaId = g.GrupoNominaId
        LEFT JOIN dbo.CatalogoEstablecimientos s ON e.EstablecimientoId = s.EstablecimientoId
    )

    -- 2. CONSULTA PRINCIPAL
    SELECT 
        e.EmpleadoId,
        e.CodRef,
        e.NombreCompleto,
        e.HorarioIdPredeterminado AS HorarioDefaultId,
        e.DepartamentoNombre AS departamento_nombre,
        e.PuestoNombre AS puesto_descripcion,
        e.FechaNacimiento,
        
        -- A) Subconsulta de Horarios Temporales (Asignaciones)
        (
            SELECT 
                CONVERT(VARCHAR(10), ht.Fecha, 120) AS Fecha,
                ht.TipoAsignacion,
                ht.HorarioId AS HorarioIdAplicable,
                ht.HorarioDetalleId AS HorarioDetalleIdAplicable,
                ht.EstatusConflictivo
            FROM dbo.HorariosTemporales ht
            WHERE ht.EmpleadoId = e.EmpleadoId
              AND ht.Fecha BETWEEN @FechaInicio AND @FechaFin
            FOR JSON PATH
        ) AS HorariosAsignados,

        -- B) NUEVA SUBCONSULTA: Estado de Fichas (Para visualizar bloqueos/validaciones)
        (
            SELECT 
                CONVERT(VARCHAR(10), fa.Fecha, 120) AS Fecha,
                fa.Estado -- Devolvemos el estado (BLOQUEADO, VALIDADO, BORRADOR, etc.)
            FROM dbo.FichaAsistencia fa
            WHERE fa.EmpleadoId = e.EmpleadoId
              AND fa.Fecha BETWEEN @FechaInicio AND @FechaFin
            FOR JSON PATH
        ) AS FichasExistentes

    FROM EmpleadosNormalizados e 
    WHERE e.Activo = 1
    
    -- FILTROS DE SEGURIDAD E INTERFAZ
    AND (@SeguridadDepts = 0 OR e.Real_DepartamentoId IN (SELECT DepartamentoId FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId))
    AND (@SeguridadGrupos = 0 OR e.Real_GrupoNominaId IN (SELECT GrupoNominaId FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId))
    AND (@SeguridadPuestos = 0 OR e.Real_PuestoId IN (SELECT PuestoId FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId))
    AND (@SeguridadEstabs = 0 OR e.Real_EstablecimientoId IN (SELECT EstablecimientoId FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId))

    AND (
        @DepartamentoFiltro IS NULL OR @DepartamentoFiltro = '[]' 
        OR e.Real_DepartamentoId IN (SELECT value FROM OPENJSON(@DepartamentoFiltro))
    )
    AND (
        @GrupoNominaFiltro IS NULL OR @GrupoNominaFiltro = '[]' 
        OR e.Real_GrupoNominaId IN (SELECT value FROM OPENJSON(@GrupoNominaFiltro))
    )
    AND (
        @PuestoFiltro IS NULL OR @PuestoFiltro = '[]' 
        OR e.Real_PuestoId IN (SELECT value FROM OPENJSON(@PuestoFiltro))
    )
    AND (
        @EstablecimientoFiltro IS NULL OR @EstablecimientoFiltro = '[]' 
        OR e.Real_EstablecimientoId IN (SELECT value FROM OPENJSON(@EstablecimientoFiltro))
    )

    ORDER BY e.NombreCompleto;
END
