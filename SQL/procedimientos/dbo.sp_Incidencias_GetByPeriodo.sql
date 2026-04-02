-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_GetByPeriodo]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_GetByPeriodo]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.20
-- Compilado:           25/03/2026, 11:52:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE [dbo].[sp_Incidencias_GetByPeriodo]
    @UsuarioId INT,
    @FechaInicio DATE,
    @FechaFin DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        i.IncidenciaId, 
        i.Fecha,          
        i.FechaCreacion,   
        i.Estado,
        i.NivelSeveridad AS Severidad,
        s_chec.Abreviatura as EstatusChecadorOriginal,
        s_man.Abreviatura as EstatusManualOriginal,
        
        COALESCE((SELECT TOP 1 Comentario 
                  FROM dbo.IncidenciasBitacora b 
                  WHERE b.IncidenciaId = i.IncidenciaId 
                  ORDER BY FechaMovimiento DESC), 'Sin comentarios') as Comentarios,
        
        e.EmpleadoId, 
        e.NombreCompleto as EmpleadoNombre, 
        e.CodRef as EmpleadoCodRef, 
        d.Nombre as Departamento, 
        
        u.NombreCompleto as AsignadoA,
        i.AsignadoAUsuarioId, 
        
        (SELECT TOP 1 r.NombreRol 
         FROM dbo.UsuariosRoles ur 
         JOIN dbo.Roles r ON ur.RoleId = r.RoleId 
         WHERE ur.UsuarioId = i.AsignadoAUsuarioId AND ur.EsPrincipal = 1) as RolAsignado
    FROM dbo.Incidencias i
    JOIN dbo.Empleados e ON i.EmpleadoId = e.EmpleadoId
    LEFT JOIN dbo.CatalogoEstatusAsistencia s_chec ON i.EstatusChecadorId = s_chec.EstatusId
    LEFT JOIN dbo.CatalogoEstatusAsistencia s_man ON i.EstatusManualId = s_man.EstatusId
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.Usuarios u ON i.AsignadoAUsuarioId = u.UsuarioId
    
    WHERE i.Fecha BETWEEN @FechaInicio AND @FechaFin
    AND (
        i.AsignadoAUsuarioId = @UsuarioId
        OR i.EmpleadoId IN (SELECT EmpleadoId FROM dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId))
    )
    ORDER BY 
        CASE i.NivelSeveridad 
            WHEN 'Critica' THEN 1 
            WHEN 'Advertencia' THEN 2 
            ELSE 3 
        END ASC, 
        i.Fecha DESC;
END
GO