-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_Update]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_Update]
                @EmpleadoId INT,
                @CodRef NVARCHAR(50),
                @Pim NVARCHAR(50) = NULL,
                @Nombres NVARCHAR(100),
                @ApellidoPaterno NVARCHAR(100),
                @ApellidoMaterno NVARCHAR(100),
                @FechaNacimiento DATE,
                @FechaIngreso DATE,
                @DepartamentoId INT,
                @PuestoId INT,
                @HorarioIdPredeterminado INT,
                @GrupoNominaId INT,
                @EstablecimientoId INT,
                @Sexo CHAR(1),
                @NSS NVARCHAR(20),
                @CURP NVARCHAR(20),
                @RFC NVARCHAR(20),
                @Imagen VARBINARY(MAX),
                @Activo BIT,
                @UsuarioId INT
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @FormatoNombre INT;
                SELECT TOP 1 @FormatoNombre = ISNULL(FormatoNombre, 1) FROM SISConfiguracion;
                
                DECLARE @NombreCompleto NVARCHAR(300);
                IF @FormatoNombre = 2
                    SET @NombreCompleto = TRIM(@ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, '') + ' ' + @Nombres);
                ELSE
                    SET @NombreCompleto = TRIM(@Nombres + ' ' + @ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, ''));

                UPDATE Empleados SET 
                    CodRef = @CodRef,
                    Pim = @Pim,
                    Nombres = @Nombres,
                    ApellidoPaterno = @ApellidoPaterno,
                    ApellidoMaterno = @ApellidoMaterno,
                    NombreCompleto = @NombreCompleto,
                    FechaNacimiento = @FechaNacimiento,
                    FechaIngreso = @FechaIngreso,
                    DepartamentoId = @DepartamentoId,
                    PuestoId = @PuestoId,
                    HorarioIdPredeterminado = @HorarioIdPredeterminado,
                    GrupoNominaId = @GrupoNominaId,
                    EstablecimientoId = @EstablecimientoId,
                    Sexo = @Sexo,
                    NSS = @NSS,
                    CURP = @CURP,
                    RFC = @RFC,
                    Imagen = @Imagen,
                    Activo = @Activo
                WHERE EmpleadoId = @EmpleadoId;
            END
GO