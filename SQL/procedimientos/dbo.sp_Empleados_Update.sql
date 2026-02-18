IF OBJECT_ID('dbo.sp_Empleados_Update') IS NOT NULL DROP PROCEDURE dbo.sp_Empleados_Update;
GO
CREATE PROCEDURE dbo.sp_Empleados_Update
    @EmpleadoId int,
    @CodRef nvarchar(20),
    @NombreCompleto nvarchar(300),
    @FechaNacimiento date = NULL,
    @FechaIngreso date = NULL,
    @DepartamentoId int = NULL,
    @GrupoNominaId int = NULL,
    @PuestoId int = NULL,
    @HorarioIdPredeterminado int = NULL,
    @EstablecimientoId int = NULL,
    @Sexo nchar(2) = NULL,
    @NSS nvarchar(40) = NULL,
    @CURP nvarchar(40) = NULL,
    @RFC nvarchar(40) = NULL,
    @Imagen varbinary(MAX) = NULL,
    @Activo bit = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.Empleados WHERE CodRef = @CodRef AND EmpleadoId <> @EmpleadoId)
    BEGIN
        RAISERROR('El código de referencia ya está en uso por otro empleado.', 16, 1);
        RETURN;
    END

    UPDATE dbo.Empleados
    SET 
        CodRef = @CodRef,
        NombreCompleto = @NombreCompleto,
        FechaNacimiento = @FechaNacimiento,
        FechaIngreso = @FechaIngreso,
        DepartamentoId = @DepartamentoId,
        GrupoNominaId = @GrupoNominaId,
        PuestoId = @PuestoId,
        HorarioIdPredeterminado = @HorarioIdPredeterminado,
        EstablecimientoId = @EstablecimientoId,
        Sexo = @Sexo,
        NSS = @NSS,
        CURP = @CURP,
        RFC = @RFC,
        Imagen = ISNULL(@Imagen, Imagen), -- Keep existing image if null passed? Or handle differently in API
        Activo = @Activo
    WHERE EmpleadoId = @EmpleadoId;
END
GO
