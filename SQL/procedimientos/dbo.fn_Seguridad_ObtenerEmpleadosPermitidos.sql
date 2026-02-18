IF OBJECT_ID('dbo.fn_Seguridad_ObtenerEmpleadosPermitidos') IS NOT NULL      DROP FUNCTION dbo.fn_Seguridad_ObtenerEmpleadosPermitidos;
GO
CREATE   FUNCTION [dbo].[fn_Seguridad_ObtenerEmpleadosPermitidos] (@UsuarioId INT)
RETURNS TABLE
AS
RETURN
(
    -- 1. Leemos la configuración dentro de la misma consulta (Optimización)
    WITH Config AS (
        SELECT 
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroDepartamentosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroDepts,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroGruposNominaActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroGrupos,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroPuestosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroPuestos,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroEstablecimientosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroEstabs
        FROM dbo.ConfiguracionSistema
    )
    
    -- 2. Devolvemos los IDs permitidos
    SELECT e.EmpleadoId
    FROM dbo.Empleados e
    CROSS JOIN Config c
    WHERE e.Activo = 1
    -- Lógica de Seguridad Estandarizada
    AND (c.FiltroDepts = 0 OR e.DepartamentoId IN (SELECT DepartamentoId FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroGrupos = 0 OR e.GrupoNominaId IN (SELECT GrupoNominaId FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroPuestos = 0 OR e.PuestoId IN (SELECT PuestoId FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroEstabs = 0 OR e.EstablecimientoId IN (SELECT EstablecimientoId FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId))
);

