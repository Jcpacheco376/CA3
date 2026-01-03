IF OBJECT_ID('dbo.sp_Empleados_GetDatos') IS NOT NULL      DROP PROCEDURE dbo.sp_Empleados_GetDatos;
GO
CREATE PROCEDURE dbo.sp_Empleados_GetDatos
    @EmpleadoId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.NombreCompleto,
        e.CodRef,
        e.FechaIngreso,
        e.FechaNacimiento,
        e.Sexo,
        e.NSS,
        e.CURP,
        e.RFC,
        ISNULL(d.Nombre, 'Sin Depto.') AS departamento_nombre,
        ISNULL(p.Nombre, 'Sin Puesto') AS puesto_descripcion,
        ISNULL(gn.Nombre, 'Sin Grupo') AS grupo_nomina_nombre,
        e.Imagen
    FROM dbo.Empleados e
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.CatalogoPuestos p ON e.PuestoId = p.PuestoId
    LEFT JOIN dbo.CatalogoGruposNomina gn ON e.GrupoNominaId = gn.GrupoNominaId
    WHERE e.EmpleadoId = @EmpleadoId;
END

