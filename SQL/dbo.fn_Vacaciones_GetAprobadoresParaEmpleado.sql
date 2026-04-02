-- ──────────────────────────────────────────────────────────────────────
-- Función: [dbo].[fn_Vacaciones_GetAprobadoresParaEmpleado]
-- Sistema: CA3 Control de Asistencia
-- Descripción: Retorna la lista de usuarios (Aprobadores) que tienen
-- en su filtro de permisos a un empleado en específico. Es la función
-- inversa a fn_Seguridad_GetEmpleadosPermitidos.
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER FUNCTION [dbo].[fn_Vacaciones_GetAprobadoresParaEmpleado] (@EmpleadoId INT)
RETURNS TABLE
AS
RETURN (
    WITH Config AS (
        SELECT 
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroDepartamentosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroDepts,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroGruposNominaActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroGrupos,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroPuestosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroPuestos,
            CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroEstablecimientosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT) as FiltroEstabs
        FROM dbo.ConfiguracionSistema
    )
    SELECT u.UsuarioId, u.NombreUsuario
    FROM dbo.Usuarios u
    CROSS JOIN Config c
    INNER JOIN dbo.Empleados e ON e.EmpleadoId = @EmpleadoId
    WHERE u.Activo = 1
    AND (c.FiltroDepts = 0 OR e.DepartamentoId IN (SELECT DepartamentoId FROM dbo.UsuariosDepartamentos WHERE UsuarioId = u.UsuarioId))
    AND (c.FiltroGrupos = 0 OR e.GrupoNominaId IN (SELECT GrupoNominaId FROM dbo.UsuariosGruposNomina WHERE UsuarioId = u.UsuarioId))
    AND (c.FiltroPuestos = 0 OR e.PuestoId IN (SELECT PuestoId FROM dbo.UsuariosPuestos WHERE UsuarioId = u.UsuarioId))
    AND (c.FiltroEstabs = 0 OR e.EstablecimientoId IN (SELECT EstablecimientoId FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = u.UsuarioId))
);
GO
