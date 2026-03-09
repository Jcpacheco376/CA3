-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_Save]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_Save]
    @EmpleadoId INT = NULL OUTPUT,
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
    @NSS NVARCHAR(20) = NULL,
    @CURP NVARCHAR(20) = NULL,
    @RFC NVARCHAR(20) = NULL,
    @Imagen VARBINARY(MAX) = NULL,
    @Activo BIT = 1,
    @UsuarioId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        -- Calcular NombreCompleto basado en Configuración
        DECLARE @FormatoNombre INT;
        SELECT TOP 1 @FormatoNombre = ISNULL(FormatoNombre, 1) FROM SISConfiguracion;
        
        DECLARE @NombreCompleto NVARCHAR(300);
        IF @FormatoNombre = 2 -- Apellidos Nombres
            SET @NombreCompleto = TRIM(@ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, '') + ' ' + @Nombres);
        ELSE -- Nombres Apellidos (Default)
            SET @NombreCompleto = TRIM(@Nombres + ' ' + @ApellidoPaterno + ' ' + ISNULL(@ApellidoMaterno, ''));
        -- Verificación básica de duplicados de CodRef si es necesario
        IF @EmpleadoId IS NULL OR @EmpleadoId = 0
        BEGIN
            -- INSERT
            IF EXISTS (SELECT 1 FROM Empleados WHERE CodRef = @CodRef)
            BEGIN
                RAISERROR('El código de referencia ya existe.', 16, 1);
                ROLLBACK TRANSACTION;
                RETURN;
            END
            INSERT INTO Empleados (
                CodRef, Pim, Nombres, ApellidoPaterno, ApellidoMaterno, NombreCompleto,
                FechaNacimiento, FechaIngreso, DepartamentoId, PuestoId, HorarioIdPredeterminado,
                GrupoNominaId, EstablecimientoId, Sexo, NSS, CURP, RFC, Imagen, Activo
            ) VALUES (
                @CodRef, @Pim, @Nombres, @ApellidoPaterno, @ApellidoMaterno, @NombreCompleto,
                @FechaNacimiento, @FechaIngreso, @DepartamentoId, @PuestoId, @HorarioIdPredeterminado,
                @GrupoNominaId, @EstablecimientoId, @Sexo, @NSS, @CURP, @RFC, @Imagen, @Activo
            );
            SET @EmpleadoId = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            -- UPDATE
            IF EXISTS (SELECT 1 FROM Empleados WHERE CodRef = @CodRef AND EmpleadoId <> @EmpleadoId)
            BEGIN
                RAISERROR('El código de referencia ya existe en otro empleado.', 16, 1);
                ROLLBACK TRANSACTION;
                RETURN;
            END
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
        COMMIT TRANSACTION;
        PRINT 'Guardado local completado.';
        
        -- Sincronización Push a Sistema Externo (BMS)
        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncEmpleados') = 'true'
        BEGIN
            PRINT 'Sincronización (PUSH) habilitada. Enviando a BMS...';
            
            DECLARE @StatusChar CHAR(1) = CASE WHEN @Activo = 1 THEN '1' ELSE '2' END; -- Asumiendo 1=Alta, 2=Baja/Otro
            EXEC [dbo].[sp_SyncToExternal_Empleado]
                @CodRef = @CodRef,
                @Nombres = @Nombres,
                @ApellidoPaterno = @ApellidoPaterno,
                @ApellidoMaterno = @ApellidoMaterno,
                @FechaNacimiento = @FechaNacimiento,
                @FechaIngreso = @FechaIngreso,
                @Sexo = @Sexo,
                @NSS = @NSS,
                @CURP = @CURP,
                @RFC = @RFC,
                @DepartamentoId = @DepartamentoId,
                @PuestoId = @PuestoId,
                @HorarioIdPredeterminado = @HorarioIdPredeterminado,
                @GrupoNominaId = @GrupoNominaId,
                @EstablecimientoId = @EstablecimientoId,
                @Status = @StatusChar;
                
            PRINT 'Sincronización completada.';
        END
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
            
        PRINT 'Error en sp_Empleados_Save: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO