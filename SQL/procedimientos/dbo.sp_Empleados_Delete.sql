IF OBJECT_ID('dbo.sp_Empleados_Delete') IS NOT NULL DROP PROCEDURE dbo.sp_Empleados_Delete;
GO
CREATE PROCEDURE dbo.sp_Empleados_Delete
    @EmpleadoId int
AS
BEGIN
    SET NOCOUNT ON;

    -- Soft delete
    UPDATE dbo.Empleados
    SET Activo = 0
    WHERE EmpleadoId = @EmpleadoId;
END
GO
