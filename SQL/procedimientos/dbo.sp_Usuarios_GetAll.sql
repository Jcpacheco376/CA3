-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Usuarios_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Usuarios_GetAll]
            AS
            BEGIN
                SET NOCOUNT ON;

                SELECT
                    u.UsuarioId,
                    u.NombreUsuario,
                    u.NombreCompleto,
                    u.Email,
                    u.Telefono,
                    u.EstaActivo,
                    u.FechaCreacion,
                    u.Theme,
                    u.AnimationsEnabled,
                    u.DebeCambiarPassword,
                    u.EmpleadoId,

                    Roles = (
                        SELECT r.RoleId, r.NombreRol, ur.EsPrincipal
                        FROM dbo.UsuariosRoles ur
                        INNER JOIN dbo.Roles r ON ur.RoleId = r.RoleId
                        WHERE ur.UsuarioId = u.UsuarioId
                        ORDER BY ur.EsPrincipal DESC, r.NombreRol ASC
                        FOR JSON PATH
                    ),

                    Departamentos = (
                        SELECT d.DepartamentoId, d.Nombre
                        FROM dbo.UsuariosDepartamentos ud
                        INNER JOIN dbo.CatalogoDepartamentos d ON ud.DepartamentoId = d.DepartamentoId
                        WHERE ud.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),

                    GruposNomina = (
                        SELECT gn.GrupoNominaId, gn.Nombre, gn.Periodo
                        FROM dbo.UsuariosGruposNomina ugn
                        INNER JOIN dbo.CatalogoGruposNomina gn ON ugn.GrupoNominaId = gn.GrupoNominaId
                        WHERE ugn.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),

                    Puestos = (
                        SELECT p.PuestoId, p.Nombre
                        FROM dbo.UsuariosPuestos up
                        INNER JOIN dbo.CatalogoPuestos p ON up.PuestoId = p.PuestoId
                        WHERE up.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    ),

                    Establecimientos = (
                        SELECT e.EstablecimientoId, e.Nombre
                        FROM dbo.UsuariosEstablecimientos ue
                        INNER JOIN dbo.CatalogoEstablecimientos e ON ue.EstablecimientoId = e.EstablecimientoId
                        WHERE ue.UsuarioId = u.UsuarioId
                        FOR JSON PATH
                    )

                FROM dbo.Usuarios u;
            END
GO