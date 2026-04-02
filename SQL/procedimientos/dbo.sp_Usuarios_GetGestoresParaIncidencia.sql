-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuarios_GetGestoresParaIncidencia]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuarios_GetGestoresParaIncidencia]
    @IncidenciaId INT
AS
BEGIN
    SET NOCOUNT ON;
    -- 1. OBTENER EMPLEADO
    DECLARE @EmpleadoId INT;
    SELECT @EmpleadoId = EmpleadoId
    FROM dbo.Incidencias
    WHERE IncidenciaId = @IncidenciaId;
    -- 3. BUSCAR GESTORES
    SELECT DISTINCT
        u.UsuarioId,
        u.NombreCompleto,
        u.Email,
        u.Theme,
        ISNULL((
            SELECT TOP 1 r.NombreRol 
            FROM dbo.UsuariosRoles ur 
            JOIN dbo.Roles r ON ur.RoleId = r.RoleId 
            WHERE ur.UsuarioId = u.UsuarioId AND ur.EsPrincipal = 1
        ), 'Sin Rol Principal') AS RolPrincipal
    FROM dbo.Usuarios u
    JOIN dbo.fn_Seguridad_GetUsuariosPermitidosPorEmpleado(@EmpleadoId) perm ON u.UsuarioId = perm.UsuarioId
    WHERE u.EstaActivo = 1
      AND EXISTS (
          SELECT 1 FROM dbo.UsuariosRoles ur JOIN dbo.Roles r ON ur.RoleId = r.RoleId JOIN dbo.RolesPermisos rp ON r.RoleId = rp.RoleId JOIN dbo.SISPermisos p ON rp.PermisoId = p.PermisoId
          WHERE ur.UsuarioId = u.UsuarioId AND p.NombrePermiso IN ('incidencias.resolve', 'incidencias.manage') AND p.Activo = 1
      )
    ORDER BY NombreCompleto;
END
GO