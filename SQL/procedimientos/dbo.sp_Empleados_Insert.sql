IF OBJECT_ID('dbo.sp_Empleados_Insert') IS NOT NULL DROP PROCEDURE dbo.sp_Empleados_Insert;
GO
CREATE PROCEDURE dbo.sp_Empleados_Insert
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
    @Activo bit = 1,
    @Zonas nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF EXISTS (SELECT 1 FROM dbo.Empleados WHERE CodRef = @CodRef)
    BEGIN
        RAISERROR('El código de referencia ya está en uso.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Empleados (
        CodRef, NombreCompleto, FechaNacimiento, FechaIngreso,
        DepartamentoId, GrupoNominaId, PuestoId, HorarioIdPredeterminado,
        EstablecimientoId, Sexo, NSS, CURP, RFC, Imagen, Activo
    )
    VALUES (
        @CodRef, @NombreCompleto, @FechaNacimiento, @FechaIngreso,
        @DepartamentoId, @GrupoNominaId, @PuestoId, @HorarioIdPredeterminado,
        @EstablecimientoId, @Sexo, @NSS, @CURP, @RFC, @Imagen, @Activo
    );
    
    DECLARE @NewEmpleadoId INT = SCOPE_IDENTITY();

    IF @Zonas IS NOT NULL
    BEGIN
        INSERT INTO dbo.EmpleadosZonas (EmpleadoId, ZonaId)
        SELECT @NewEmpleadoId, ZonaId
        FROM OPENJSON(@Zonas) WITH (ZonaId INT '$.ZonaId');
    END

    SELECT @NewEmpleadoId as EmpleadoId;
END
GO
