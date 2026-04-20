-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_HorariosTemporales_GetByPeriodo]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_HorariosTemporales_GetByPeriodo]
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

    -- 1. LEER CONFIGURACI�N DE SEGURIDAD
    DECLARE @SeguridadDepts BIT, @SeguridadGrupos BIT, @SeguridadPuestos BIT, @SeguridadEstabs BIT;
    SELECT 
        @SeguridadDepts = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroDepartamentosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @SeguridadGrupos = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroGruposNominaActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @SeguridadPuestos = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroPuestosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @SeguridadEstabs = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroEstablecimientosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT)
    FROM dbo.SISConfiguracion;

    -- ---------------------------------------------------------
    -- CTE: NORMALIZACI�N DE IDs
    -- ---------------------------------------------------------
    ;WITH EmpleadosNormalizados AS (
        SELECT 
        e.EmpleadoId,
        e.CodRef,
        e.NombreCompleto,
        e.HorarioIdPredeterminado AS HorarioDefaultId,
        e.DepartamentoId AS Real_DepartamentoId,
        COALESCE(d.Nombre, 'Sin Departamento') AS departamento_nombre,
        e.PuestoId AS Real_PuestoId,
        COALESCE(p.Nombre, 'Sin Puesto') AS puesto_descripcion,
        e.GrupoNominaId AS Real_GrupoNominaId,
        e.EstablecimientoId AS Real_EstablecimientoId,
        e.FechaNacimiento,
        e.FechaIngreso,
        e.FechaBaja
    FROM dbo.Empleados e
    INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidosVigentes(@UsuarioId, @FechaInicio, @FechaFin) p_sec ON e.EmpleadoId = p_sec.EmpleadoId
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.CatalogoPuestos p ON e.PuestoId = p.PuestoId
    )

    -- 2. CONSULTA PRINCIPAL
    SELECT 
        e.EmpleadoId,
        e.CodRef,
        e.NombreCompleto,
        e.HorarioDefaultId,
        e.departamento_nombre,
        e.puesto_descripcion,
        e.FechaNacimiento,
        e.FechaIngreso,
        e.FechaBaja,
        
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
    WHERE 1=1
    -- FILTROS DE INTERFAZ (La seguridad ya se aplic en la CTE)
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
GO