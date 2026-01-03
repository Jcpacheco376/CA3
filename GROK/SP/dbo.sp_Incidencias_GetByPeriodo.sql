IF OBJECT_ID('dbo.sp_Incidencias_GetByPeriodo') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_GetByPeriodo;
GO
CREATE   PROCEDURE [dbo].[sp_Incidencias_GetByPeriodo]
    @UsuarioId INT,
    @FechaInicio DATE,
    @FechaFin DATE
AS
BEGIN
    SET NOCOUNT ON;
    -- (Filtros omitidos, se asumen presentes)
    DECLARE @FiltroDepts BIT = 0;

    SELECT 
        i.IncidenciaId, i.Fecha, i.Estado,
        i.NivelSeveridad AS Severidad,
        s_chec.Abreviatura as EstatusChecadorOriginal,
        s_man.Abreviatura as EstatusManualOriginal, -- <--- CAMBIO DE ALIAS para el Frontend
        
        COALESCE((SELECT TOP 1 Comentario FROM IncidenciasBitacora b WHERE b.IncidenciaId = i.IncidenciaId ORDER BY FechaMovimiento DESC), 'Sin comentarios') as Comentarios,
        e.EmpleadoId, e.NombreCompleto as EmpleadoNombre, e.CodRef as EmpleadoCodRef, d.Nombre as Departamento, u.NombreCompleto as AsignadoA,
        (SELECT TOP 1 r.NombreRol FROM UsuariosRoles ur JOIN Roles r ON ur.RoleId = r.RoleId WHERE ur.UsuarioId = i.AsignadoAUsuarioId) as RolAsignado

    FROM dbo.Incidencias i
    JOIN dbo.Empleados e ON i.EmpleadoId = e.EmpleadoId
    LEFT JOIN dbo.CatalogoEstatusAsistencia s_chec ON i.EstatusChecadorId = s_chec.EstatusId
    LEFT JOIN dbo.CatalogoEstatusAsistencia s_man ON i.EstatusManualId = s_man.EstatusId -- <--- CAMBIO
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.Usuarios u ON i.AsignadoAUsuarioId = u.UsuarioId
    
    WHERE i.Fecha BETWEEN @FechaInicio AND @FechaFin
    ORDER BY i.NivelSeveridad DESC, i.Fecha DESC;
END

