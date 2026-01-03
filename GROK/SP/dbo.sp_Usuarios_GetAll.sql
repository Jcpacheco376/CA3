IF OBJECT_ID('dbo.sp_Usuarios_GetAll') IS NOT NULL      DROP PROCEDURE dbo.sp_Usuarios_GetAll;
GO
CREATE PROCEDURE [dbo].[sp_Usuarios_GetAll]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.UsuarioId, u.NombreCompleto, u.NombreUsuario, u.Email, u.EstaActivo,
        ISNULL(u.Theme, 'indigo') AS Theme, 
        ISNULL(u.AnimationsEnabled, 1) AS AnimationsEnabled,
        
        -- CAMBIO CLAVE: Ordenamos por EsPrincipal DESC para que el principal sea SIEMPRE el índice [0]
        (SELECT 
            r.RoleId, 
            r.NombreRol
         FROM dbo.Roles r 
         INNER JOIN dbo.UsuariosRoles ur ON r.RoleId = ur.RoleId 
         WHERE ur.UsuarioId = u.UsuarioId 
         ORDER BY ur.EsPrincipal DESC, r.NombreRol ASC -- <--- AQUÍ LA MAGIA
         FOR JSON PATH) AS Roles,

        (SELECT d.DepartamentoId, d.Nombre FROM dbo.CatalogoDepartamentos d INNER JOIN dbo.UsuariosDepartamentos ud ON d.DepartamentoId = ud.DepartamentoId WHERE ud.UsuarioId = u.UsuarioId FOR JSON PATH) AS Departamentos,
        (SELECT gn.GrupoNominaId, gn.Nombre FROM dbo.CatalogoGruposNomina gn INNER JOIN dbo.UsuariosGruposNomina ugn ON gn.GrupoNominaId = ugn.GrupoNominaId WHERE ugn.UsuarioId = u.UsuarioId FOR JSON PATH) AS GruposNomina,
        (SELECT p.PuestoId, p.Nombre FROM dbo.CatalogoPuestos p INNER JOIN dbo.UsuariosPuestos up ON p.PuestoId = up.PuestoId WHERE up.UsuarioId = u.UsuarioId FOR JSON PATH) AS Puestos,
        (SELECT e.EstablecimientoId, e.Nombre FROM dbo.CatalogoEstablecimientos e INNER JOIN dbo.UsuariosEstablecimientos ue ON e.EstablecimientoId = ue.EstablecimientoId WHERE ue.UsuarioId = u.UsuarioId FOR JSON PATH) AS Establecimientos

    FROM dbo.Usuarios u;
END
