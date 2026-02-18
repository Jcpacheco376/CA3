IF OBJECT_ID('dbo.sp_Empleados_GetDatos') IS NOT NULL      DROP PROCEDURE dbo.sp_Empleados_GetDatos;
GO
CREATE PROCEDURE dbo.sp_Empleados_GetDatos
    @EmpleadoId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.EmpleadoId,
        e.CodRef,
        e.NombreCompleto,
        e.FechaIngreso,
        e.FechaNacimiento,
        e.Sexo,
        e.NSS,
        e.CURP,
        e.RFC,
        e.DepartamentoId,
        e.PuestoId,
        e.GrupoNominaId,
        e.EstablecimientoId,
        e.HorarioIdPredeterminado,
        e.Activo,
        e.Imagen,
        (
            SELECT z.ZonaId, z.Nombre
            FROM dbo.EmpleadosZonas ez
            INNER JOIN dbo.Zonas z ON ez.ZonaId = z.ZonaId
            WHERE ez.EmpleadoId = e.EmpleadoId
            FOR JSON PATH
        ) AS Zonas
    FROM dbo.Empleados e
    WHERE e.EmpleadoId = @EmpleadoId;
END

