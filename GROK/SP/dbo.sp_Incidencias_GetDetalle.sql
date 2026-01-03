IF OBJECT_ID('dbo.sp_Incidencias_GetDetalle') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_GetDetalle;
GO

CREATE PROCEDURE [dbo].[sp_Incidencias_GetDetalle]
    @IncidenciaId INT
AS
BEGIN
    SET NOCOUNT ON;

    -- RESULTSET 1: HEADER (Igual que antes)
    SELECT 
        i.IncidenciaId, i.EmpleadoId, i.Fecha, i.Estado, i.AsignadoAUsuarioId,
        i.NivelSeveridad AS NivelCriticidad, i.RequiereAutorizacion,
        ISNULL(ea_sys.Abreviatura, 'F') AS EstatusChecadorOriginal,
        ISNULL(ea_man.Abreviatura, '-') AS EstatusManualOriginal,
        e.NombreCompleto AS Empleado, e.CodRef, d.Nombre AS Departamento,
        u_asig.NombreCompleto AS AsignadoA, -- Nombre del responsable actual
		ISNULL(r_asig.NombreRol, 'Usuario') AS AsignadoARol,
        ct.Nombre AS TipoIncidencia
    FROM dbo.Incidencias i
    JOIN dbo.Empleados e ON i.EmpleadoId = e.EmpleadoId
    JOIN dbo.CatalogoTiposIncidencia ct ON i.TipoIncidenciaId = ct.TipoIncidenciaId
    LEFT JOIN dbo.CatalogoEstatusAsistencia ea_sys ON i.EstatusChecadorId = ea_sys.EstatusId
    LEFT JOIN dbo.CatalogoEstatusAsistencia ea_man ON i.EstatusManualId = ea_man.EstatusId
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
	LEFT JOIN dbo.Usuarios u_asig ON i.AsignadoAUsuarioId = u_asig.UsuarioId
    LEFT JOIN dbo.UsuariosRoles ur_asig ON u_asig.UsuarioId = ur_asig.UsuarioId AND ur_asig.EsPrincipal = 1
    LEFT JOIN dbo.Roles r_asig ON ur_asig.RoleId = r_asig.RoleId
    WHERE i.IncidenciaId = @IncidenciaId;

    -- RESULTSET 2: TIMELINE (MODIFICADO)
    SELECT 
        b.BitacoraId,
        b.IncidenciaId,
        b.UsuarioId,
        b.FechaMovimiento,
        b.Accion,
        b.Comentario,
        b.EstadoNuevo,
        u.NombreCompleto AS UsuarioNombre, -- El que ejecutó la acción
        
        -- NUEVO: Nombre del usuario al que se le asignó (si aplica)
        u_target.NombreCompleto AS AsignadoANombre
        
    FROM dbo.IncidenciasBitacora b
    LEFT JOIN dbo.Usuarios u ON b.UsuarioId = u.UsuarioId
    -- Join para obtener nombre del destino
    LEFT JOIN dbo.Usuarios u_target ON b.AsignadoA_Nuevo = u_target.UsuarioId
    WHERE b.IncidenciaId = @IncidenciaId
    ORDER BY b.FechaMovimiento ASC;

    -- RESULTSET 3: AUTORIZACIONES (Igual que antes, con XML PATH)
    SELECT 
        ia.AutorizacionId, ia.RolRequeridoId, r.NombreRol as RolRequerido, 
        ia.Estatus, ia.FechaRespuesta, u.NombreCompleto as UsuarioNombre,
        (SELECT STUFF((SELECT ', ' + usr.NombreCompleto FROM dbo.Usuarios usr JOIN dbo.UsuariosRoles ur ON usr.UsuarioId = ur.UsuarioId WHERE ur.RoleId = ia.RolRequeridoId AND usr.EstaActivo = 1 FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 2, '')) as PosiblesFirmantes
    FROM dbo.IncidenciasAutorizaciones ia
    JOIN dbo.Roles r ON ia.RolRequeridoId = r.RoleId
    LEFT JOIN dbo.Usuarios u ON ia.UsuarioAutorizoId = u.UsuarioId
    WHERE ia.IncidenciaId = @IncidenciaId;
END


