IF OBJECT_ID('dbo.sp_Usuarios_GetGestoresParaIncidencia') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuarios_GetGestoresParaIncidencia;
GO

CREATE PROCEDURE [dbo].[sp_Usuarios_GetGestoresParaIncidencia]
    @IncidenciaId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. OBTENER CONFIGURACIÓN
    DECLARE @FiltroDepts BIT, @FiltroGrupos BIT, @FiltroPuestos BIT, @FiltroEstabs BIT;
    SELECT 
        @FiltroDepts = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroDepartamentosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @FiltroGrupos = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroGruposNominaActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @FiltroPuestos = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroPuestosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT),
        @FiltroEstabs = CAST(ISNULL(MAX(CASE WHEN ConfigKey = 'FiltroEstablecimientosActivo' THEN ConfigValue ELSE 'false' END), 'false') AS BIT)
    FROM dbo.ConfiguracionSistema;

    -- 2. DATOS EMPLEADO
    DECLARE @EmpDepto INT, @EmpGrupo INT, @EmpPuesto INT, @EmpEstab INT;
    SELECT @EmpDepto = e.DepartamentoId, @EmpGrupo = e.GrupoNominaId, @EmpPuesto = e.PuestoId, @EmpEstab = e.EstablecimientoId
    FROM dbo.Incidencias i JOIN dbo.Empleados e ON i.EmpleadoId = e.EmpleadoId WHERE i.IncidenciaId = @IncidenciaId;

    -- 3. BUSCAR GESTORES
    SELECT DISTINCT
        u.UsuarioId,
        u.NombreCompleto,
        u.Email,
        
        ISNULL((
            SELECT TOP 1 r.NombreRol 
            FROM dbo.UsuariosRoles ur 
            JOIN dbo.Roles r ON ur.RoleId = r.RoleId 
            WHERE ur.UsuarioId = u.UsuarioId AND ur.EsPrincipal = 1
        ), 'Sin Rol Principal') AS RolPrincipal

    FROM dbo.Usuarios u
    WHERE u.EstaActivo = 1
      AND EXISTS (
          SELECT 1 FROM dbo.UsuariosRoles ur JOIN dbo.Roles r ON ur.RoleId = r.RoleId JOIN dbo.RolesPermisos rp ON r.RoleId = rp.RoleId JOIN dbo.Permisos p ON rp.PermisoId = p.PermisoId
          WHERE ur.UsuarioId = u.UsuarioId AND p.NombrePermiso IN ('incidencias.resolve', 'incidencias.manage') AND p.Activo = 1
      )
      AND (
          (@FiltroDepts = 0 OR (NOT EXISTS (SELECT 1 FROM dbo.UsuariosDepartamentos WHERE UsuarioId = u.UsuarioId) OR EXISTS (SELECT 1 FROM dbo.UsuariosDepartamentos WHERE UsuarioId = u.UsuarioId AND DepartamentoId = @EmpDepto)))
          AND
          (@FiltroGrupos = 0 OR (NOT EXISTS (SELECT 1 FROM dbo.UsuariosGruposNomina WHERE UsuarioId = u.UsuarioId) OR EXISTS (SELECT 1 FROM dbo.UsuariosGruposNomina WHERE UsuarioId = u.UsuarioId AND GrupoNominaId = @EmpGrupo)))
          AND
          (@FiltroPuestos = 0 OR (NOT EXISTS (SELECT 1 FROM dbo.UsuariosPuestos WHERE UsuarioId = u.UsuarioId) OR EXISTS (SELECT 1 FROM dbo.UsuariosPuestos WHERE UsuarioId = u.UsuarioId AND PuestoId = @EmpPuesto)))
          AND
          (@FiltroEstabs = 0 OR (NOT EXISTS (SELECT 1 FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = u.UsuarioId) OR EXISTS (SELECT 1 FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = u.UsuarioId AND EstablecimientoId = @EmpEstab)))
      )
    ORDER BY NombreCompleto;
END

