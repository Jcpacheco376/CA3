IF OBJECT_ID('dbo.sp_Empleados_GetAll') IS NOT NULL DROP PROCEDURE dbo.sp_Empleados_GetAll;
GO
CREATE PROCEDURE dbo.sp_Empleados_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        e.EmpleadoId,
        e.CodRef,
        e.NombreCompleto,
        e.Imagen,
        e.Activo,
        e.FechaIngreso,
        
        -- Department info
        e.DepartamentoId,
        d.Nombre AS DepartamentoNombre,
        
        -- Position info
        e.PuestoId,
        p.Nombre AS PuestoNombre,
        
        -- Schedule info for Logic
        e.HorarioIdPredeterminado,
        h.Nombre as HorarioNombre,
        h.EsRotativo,
        h.Turno,
        
        -- Device/Zone info logic
        (SELECT COUNT(1) FROM dbo.EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId) as ZonasAsignadas,

        -- Zones JSON
        (
            SELECT z.ZonaId, z.Nombre 
            FROM dbo.EmpleadosZonas ez 
            INNER JOIN dbo.Zonas z ON ez.ZonaId = z.ZonaId 
            WHERE ez.EmpleadoId = e.EmpleadoId 
            FOR JSON PATH
        ) as Zonas

    FROM dbo.Empleados e
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.CatalogoPuestos p ON e.PuestoId = p.PuestoId
    LEFT JOIN dbo.CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
    WHERE e.Activo = 1
    ORDER BY e.NombreCompleto ASC;
END
GO
