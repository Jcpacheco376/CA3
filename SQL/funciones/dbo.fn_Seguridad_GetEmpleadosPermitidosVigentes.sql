-- ──────────────────────────────────────────────────────────────────────
-- Función: [dbo].[fn_Seguridad_GetEmpleadosPermitidosVigentes]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.20
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE FUNCTION [dbo].[fn_Seguridad_GetEmpleadosPermitidosVigentes]
(
    @UsuarioId INT,
    @FechaInicio DATE = NULL,
    @FechaFin DATE = NULL
)
RETURNS TABLE
AS
RETURN
(
    WITH Config AS (
        SELECT 
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroDepartamentosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroDepts,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroGruposNominaActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroGrupos,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroPuestosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroPuestos,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroEstablecimientosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroEstabs
        FROM dbo.ConfiguracionSistema
    )

    SELECT e.EmpleadoId
    FROM dbo.Empleados e
    CROSS JOIN Config c
    WHERE 
    (
        -- Si no se proporcionan fechas, comportamiento legacy (solo activos)
        (@FechaInicio IS NULL AND @FechaFin IS NULL AND e.Activo = 1)
        OR 
        -- Si se proporcionan fechas, validar vigencia en el periodo
        (
            @FechaInicio IS NOT NULL AND @FechaFin IS NOT NULL AND
            e.FechaIngreso <= @FechaFin AND 
            (e.FechaBaja IS NULL OR e.FechaBaja >= @FechaInicio)
        )
        OR
        -- Si solo se proporciona una fecha (corte), validar que estuviera activo ese día
        (
            @FechaInicio IS NOT NULL AND @FechaFin IS NULL AND
            e.FechaIngreso <= @FechaInicio AND 
            (e.FechaBaja IS NULL OR e.FechaBaja >= @FechaInicio)
        )
    )
    AND (c.FiltroDepts = 0 OR e.DepartamentoId IN (SELECT DepartamentoId FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroGrupos = 0 OR e.GrupoNominaId IN (SELECT GrupoNominaId FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroPuestos = 0 OR e.PuestoId IN (SELECT PuestoId FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroEstabs = 0 OR e.EstablecimientoId IN (SELECT EstablecimientoId FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId))
);
GO
