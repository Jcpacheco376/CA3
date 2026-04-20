-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[fn_Seguridad_GetEmpleadosPermitidos_V2]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER FUNCTION [dbo].[fn_Seguridad_GetEmpleadosPermitidos_V2] (
    @UsuarioId INT,
    @IncluirInactivos BIT = 0
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
        FROM dbo.SISConfiguracion
    )
    
    SELECT e.EmpleadoId
    FROM dbo.Empleados e
    CROSS JOIN Config c
    WHERE (@IncluirInactivos = 1 OR e.Activo = 1)
    AND (c.FiltroDepts = 0 OR e.DepartamentoId IN (SELECT DepartamentoId FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroGrupos = 0 OR e.GrupoNominaId IN (SELECT GrupoNominaId FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroPuestos = 0 OR e.PuestoId IN (SELECT PuestoId FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId))
    AND (c.FiltroEstabs = 0 OR e.EstablecimientoId IN (SELECT EstablecimientoId FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId))
);
GO