-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_SyncToExternal_Empleado]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_SyncToExternal_Empleado]
    @CodRef NVARCHAR(50),
    @NombreCompleto NVARCHAR(300),
    @Nombres NVARCHAR(100),
    @ApellidoPaterno NVARCHAR(100),
    @ApellidoMaterno NVARCHAR(100),
    @FechaNacimiento DATE,
    @FechaIngreso DATE,
    @Sexo CHAR(1),
    @NSS NVARCHAR(20),
    @CURP NVARCHAR(20),
    @RFC NVARCHAR(20),
    @DepartamentoId INT,
    @PuestoId INT,
    @HorarioIdPredeterminado INT,
    @GrupoNominaId INT,
    @EstablecimientoId INT,
    @Status CHAR(1),
    @FechaBaja DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Obtener Nombre de BD Externa de Configuracion
    DECLARE @TargetDB NVARCHAR(100);
    SELECT TOP 1 @TargetDB = ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'DBENTRADA';
    
    IF @TargetDB IS NULL OR @TargetDB = ''
    BEGIN
        PRINT 'Configuración DBENTRADA no encontrada. Omitiendo PUSH.';
        RETURN;
    END
    -- Obtener CodRefs de los catálogos relacionales
    DECLARE @DeptoCod NVARCHAR(50), @PuestoCod NVARCHAR(50), @HorarioCod NVARCHAR(50), @GrupoCod NVARCHAR(50), @EstabCod NVARCHAR(50);
    SELECT @DeptoCod = CodRef FROM CatalogoDepartamentos WHERE DepartamentoId = @DepartamentoId;
    SELECT @PuestoCod = CodRef FROM CatalogoPuestos WHERE PuestoId = @PuestoId;
    SELECT @HorarioCod = CodRef FROM CatalogoHorarios WHERE HorarioId = @HorarioIdPredeterminado;
    SELECT @GrupoCod = CodRef FROM CatalogoGruposNomina WHERE GrupoNominaId = @GrupoNominaId;
    SELECT @EstabCod = CodRef FROM CatalogoEstablecimientos WHERE EstablecimientoId = @EstablecimientoId;
    DECLARE @SQL NVARCHAR(MAX);
    
    -- Construir SQL Dinámico
    SET @SQL = '
    MERGE INTO ' + QUOTENAME(@TargetDB) + '.[dbo].[empleados] AS Target
    USING (SELECT 
        @CodRef AS empleado,
        @NombreCompleto AS nombre_completo,
        @Nombres AS nombre,
        @ApellidoPaterno AS ap_paterno,
        @ApellidoMaterno AS ap_materno,
        @FechaNacimiento AS fecha_nacimiento,
        @FechaIngreso AS fecha_ingreso,
        @Sexo AS sexo,
        @NSS AS reg_imss,
        @CURP AS curp,
        @RFC AS rfc,
        @DeptoCod AS departamento,
        @PuestoCod AS puesto,
        @HorarioCod AS horario,
        @GrupoCod AS grupo_nomina,
        @EstabCod AS cod_estab,
        @Status AS status_empleado,
        @FechaBaja AS fecha_baja
    ) AS Source ON RTRIM(Target.empleado) = Source.empleado
    WHEN MATCHED AND (
        RTRIM(Target.nombre_completo) <> Source.nombre_completo OR
        RTRIM(Target.nombre) <> Source.nombre OR
        RTRIM(Target.ap_paterno) <> Source.ap_paterno OR
        RTRIM(Target.ap_materno) <> Source.ap_materno OR
        Target.status_empleado <> Source.status_empleado
    ) THEN
        UPDATE SET 
            Target.nombre_completo = Source.nombre_completo,
            Target.nombre = Source.nombre,
            Target.ap_paterno = Source.ap_paterno,
            Target.ap_materno = Source.ap_materno,
            Target.fecha_nacimiento = Source.fecha_nacimiento,
            Target.fecha_ingreso = Source.fecha_ingreso,
            Target.sexo = Source.sexo,
            Target.reg_imss = Source.reg_imss,
            Target.curp = Source.curp,
            Target.rfc = Source.rfc,
            Target.departamento = Source.departamento,
            Target.puesto = Source.puesto,
            Target.horario = Source.horario,
            Target.grupo_nomina = Source.grupo_nomina,
            Target.cod_estab = Source.cod_estab,
            Target.status_empleado = Source.status_empleado,
            Target.fecha_baja = ISNULL(Source.fecha_baja, Target.fecha_baja)
    WHEN NOT MATCHED BY TARGET THEN
        INSERT (
            empleado, nombre_completo, nombre, ap_paterno, ap_materno,
            fecha_nacimiento, fecha_ingreso, sexo, reg_imss, curp, rfc,
            departamento, puesto, horario, grupo_nomina, cod_estab, status_empleado, fecha_baja
        )
        VALUES (
            Source.empleado, Source.nombre_completo, Source.nombre, Source.ap_paterno, Source.ap_materno,
            Source.fecha_nacimiento, Source.fecha_ingreso, Source.sexo, Source.reg_imss, Source.curp, Source.rfc,
            Source.departamento, Source.puesto, Source.horario, Source.grupo_nomina, Source.cod_estab, Source.status_empleado, Source.fecha_baja
        );';
    BEGIN TRY
        EXEC sp_executesql @SQL, 
            N'@CodRef NVARCHAR(50), @NombreCompleto NVARCHAR(300), @Nombres NVARCHAR(100), @ApellidoPaterno NVARCHAR(100), @ApellidoMaterno NVARCHAR(100),
              @FechaNacimiento DATE, @FechaIngreso DATE, @Sexo CHAR(1), @NSS NVARCHAR(20), @CURP NVARCHAR(20), @RFC NVARCHAR(20),
              @DeptoCod NVARCHAR(50), @PuestoCod NVARCHAR(50), @HorarioCod NVARCHAR(50), @GrupoCod NVARCHAR(50), @EstabCod NVARCHAR(50), @Status CHAR(1), @FechaBaja DATE',
            @CodRef, @NombreCompleto, @Nombres, @ApellidoPaterno, @ApellidoMaterno,
            @FechaNacimiento, @FechaIngreso, @Sexo, @NSS, @CURP, @RFC,
            @DeptoCod, @PuestoCod, @HorarioCod, @GrupoCod, @EstabCod, @Status, @FechaBaja;
    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Empleado: ' + ERROR_MESSAGE();
    END CATCH
END
GO