CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetPermitidos]
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.EmpleadoId,
        e.Numero,
        e.Nombre,
        e.Rfc,
        e.Activo
    FROM dbo.Empleados e
    INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) p ON e.EmpleadoId = p.EmpleadoId
    WHERE e.Activo = 1
    ORDER BY e.Nombre;
END
GO
