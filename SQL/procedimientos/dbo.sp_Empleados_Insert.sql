-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_Insert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_Insert]
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
                @UsuarioId INT,
                @NewId INT OUTPUT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Calculate NombreCompleto based on Config
                DECLARE @FormatoNombre INT;
                SELECT TOP 1 @FormatoNombre = ISNULL(FormatoNombre, 1) FROM SISConfiguracion;
                
                DECLARE @NombreCompleto NVARCHAR(300);
                IF @FormatoNombre = 2 -- Apellidos Nombres
                    SET @NombreCompleto = TRIM(@ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, '') + ' ' + @Nombres);
                ELSE -- Nombres Apellidos (Default)
                    SET @NombreCompleto = TRIM(@Nombres + ' ' + @ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, ''));

                INSERT INTO Empleados (
                    CodRef, Pim, Nombres, ApellidoPaterno, ApellidoMaterno, NombreCompleto,
                    FechaNacimiento, FechaIngreso, DepartamentoId, PuestoId, HorarioIdPredeterminado,
                    GrupoNominaId, EstablecimientoId, Sexo, NSS, CURP, RFC, Imagen, Activo
                ) VALUES (
                    @CodRef, @Pim, @Nombres, @ApellidoPaterno, @ApellidoMaterno, @NombreCompleto,
                    @FechaNacimiento, @FechaIngreso, @DepartamentoId, @PuestoId, @HorarioIdPredeterminado,
                    @GrupoNominaId, @EstablecimientoId, @Sexo, @NSS, @CURP, @RFC, @Imagen, 1
                );

                SET @NewId = SCOPE_IDENTITY();
            END
GO