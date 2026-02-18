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
        e.DepartamentoId,
        d.Nombre AS DepartamentoNombre,
        e.PuestoId,
        p.Nombre AS PuestoNombre,
        e.GrupoNominaId,
        gn.Nombre AS GrupoNominaNombre,
        e.EstablecimientoId,
        est.Nombre AS EstablecimientoNombre,
        e.Activo,
        e.FechaIngreso,
        e.Imagen 
    FROM dbo.Empleados e
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.CatalogoPuestos p ON e.PuestoId = p.PuestoId
    LEFT JOIN dbo.CatalogoGruposNomina gn ON e.GrupoNominaId = gn.GrupoNominaId
    LEFT JOIN dbo.CatalogoEstablecimientos est ON e.EstablecimientoId = est.EstablecimientoId
    WHERE e.Activo = 1
    ORDER BY e.NombreCompleto;
END
GO
