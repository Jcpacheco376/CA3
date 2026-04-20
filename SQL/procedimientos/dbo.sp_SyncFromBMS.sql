-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_SyncFromBMS]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_SyncFromBMS]
    @SourceDB varchar(100) = NULL 
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @SourceDB IS NULL OR @SourceDB = ''
    BEGIN
        SELECT TOP 1 @SourceDB = ConfigValue 
        FROM dbo.SISConfiguracion 
        WHERE ConfigKey = 'DBENTRADA';
        IF @SourceDB IS NULL OR @SourceDB = ''
        BEGIN
            PRINT 'Error: No se especificó @SourceDB y no existe configuración para DBENTRADA.';
            RETURN;
        END
        PRINT 'Usando Base de Datos Origen desde Configuración: ' + @SourceDB;
    END
    ELSE
    BEGIN
        PRINT 'Usando Base de Datos Origen desde Parámetro: ' + @SourceDB;
    END
    DECLARE @SQL NVARCHAR(MAX);
    BEGIN TRY
        BEGIN TRANSACTION;
        -- 1. Sincronización de CatalogoDepartamentos
        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncDepartamentos') = 'true'
        BEGIN
            PRINT 'Sincronizando CatalogoDepartamentos...';
            SET @SQL = '
            MERGE dbo.CatalogoDepartamentos AS Target
            USING (
                SELECT RTRIM(departamento) AS departamento, RTRIM(nombre) AS nombre, status 
                FROM ' + QUOTENAME(@SourceDB) + '.dbo.departamentos
            ) AS Source ON Target.CodRef = Source.departamento
            WHEN MATCHED AND (Target.Nombre <> Source.nombre OR Target.Activo <> (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END)) THEN
                UPDATE SET Target.Nombre = Source.nombre, Target.Activo = (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (CodRef, Nombre, Activo)
                VALUES (Source.departamento, Source.nombre, (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END))
            WHEN NOT MATCHED BY SOURCE THEN
                UPDATE SET Target.Activo = 0;';
            
            EXEC sp_executesql @SQL;
        END
        -- 2. Sincronización de CatalogoGruposNomina
        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncGruposNomina') = 'true'
        BEGIN
            PRINT 'Sincronizando CatalogoGruposNomina...';
            SET @SQL = '
            MERGE dbo.CatalogoGruposNomina AS Target
            USING (
                SELECT RTRIM(grupo_nomina) AS grupo_nomina, RTRIM(nombre) AS nombre, status
                FROM ' + QUOTENAME(@SourceDB) + '.dbo.grupos_nomina
            ) AS Source ON Target.CodRef = Source.grupo_nomina
            WHEN MATCHED AND (Target.Nombre <> Source.nombre OR Target.Activo <> (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END)) THEN
                UPDATE SET Target.Nombre = Source.nombre, Target.Activo = (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (CodRef, Nombre, Activo)
                VALUES (Source.grupo_nomina, Source.nombre, (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END))
            WHEN NOT MATCHED BY SOURCE THEN
                UPDATE SET Target.Activo = 0;';
            EXEC sp_executesql @SQL;
        END
        -- 3. Sincronización de CatalogoPuestos
        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncPuestos') = 'true'
        BEGIN
            PRINT 'Sincronizando CatalogoPuestos...';
            SET @SQL = '
            MERGE dbo.CatalogoPuestos AS Target
            USING (
                SELECT RTRIM(puesto) AS puesto, RTRIM(nombre) AS nombre, status
                FROM ' + QUOTENAME(@SourceDB) + '.dbo.puestos
            ) AS Source ON Target.CodRef = Source.puesto
            WHEN MATCHED AND (Target.Nombre <> Source.nombre OR Target.Activo <> (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END)) THEN
                UPDATE SET Target.Nombre = Source.nombre, Target.Activo = (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (CodRef, Nombre, Activo)
                VALUES (Source.puesto, Source.nombre, (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END))
            WHEN NOT MATCHED BY SOURCE THEN
                UPDATE SET Target.Activo = 0;';
            EXEC sp_executesql @SQL;
        END
        -- 4. Sincronización de CatalogoHorarios (Cabeceras y Detalles)
        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncHorarios') = 'true'
        BEGIN
            PRINT 'Sincronizando CatalogoHorarios (Cabeceras)...';
            SET @SQL = '
            MERGE dbo.CatalogoHorarios AS Target
            USING (
                SELECT RTRIM(horario) AS horario, RTRIM(nombre) AS nombre, minutos_tolerancia, status
                FROM ' + QUOTENAME(@SourceDB) + '.dbo.horarios
            ) AS Source ON Target.CodRef = Source.horario
            WHEN MATCHED AND (Target.Nombre <> Source.nombre OR Target.MinutosTolerancia <> Source.minutos_tolerancia OR Target.Activo <> (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END)) THEN
                UPDATE SET Target.Nombre = Source.nombre, Target.MinutosTolerancia = Source.minutos_tolerancia, Target.Activo = (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (CodRef, Abreviatura, Nombre, MinutosTolerancia, Activo)
                VALUES (Source.horario, '''', Source.nombre, Source.minutos_tolerancia, (CASE WHEN Source.status = ''V'' THEN 1 ELSE 0 END));';
            EXEC sp_executesql @SQL;
            PRINT 'Sincronizando CatalogoHorariosDetalle (Detalles de días)...';
            SET @SQL = '
            MERGE dbo.CatalogoHorariosDetalle AS Target
            USING (
                SELECT
                    ch.HorarioId,
                    CASE CAST(m.dia_semana AS INT) WHEN 1 THEN 7 ELSE CAST(m.dia_semana AS INT) - 1 END AS DiaSemana,
                    CASE WHEN m.horas_entrada1 > 0 OR m.minutos_entrada1 > 0 THEN 1 ELSE 0 END AS EsDiaLaboral,
                    TIMEFROMPARTS(m.horas_entrada1, m.minutos_entrada1, 0, 0, 0) AS HoraEntrada, 
                    TIMEFROMPARTS(m.horas_salida1, m.minutos_salida1, 0, 0, 0) AS HoraSalida,    
                    TIMEFROMPARTS(m.horas_salida2, m.minutos_salida2, 0, 0, 0) AS HoraInicioComida,
                    TIMEFROMPARTS(m.horas_entrada2, m.minutos_entrada2, 0, 0, 0) AS HoraFinComida
                FROM ' + QUOTENAME(@SourceDB) + '.dbo.mhorarios m
                JOIN dbo.CatalogoHorarios ch ON RTRIM(m.horario) = ch.CodRef
            ) AS Source
            ON (Target.HorarioId = Source.HorarioId AND Target.DiaSemana = Source.DiaSemana)     
            WHEN MATCHED AND (
                Target.EsDiaLaboral <> Source.EsDiaLaboral OR
                ISNULL(Target.HoraEntrada, ''00:00'') <> ISNULL(Source.HoraEntrada, ''00:00'') OR
                ISNULL(Target.HoraSalida, ''00:00'') <> ISNULL(Source.HoraSalida, ''00:00'') OR  
                ISNULL(Target.HoraInicioComida, ''00:00'') <> ISNULL(Source.HoraInicioComida, ''00:00'') OR
                ISNULL(Target.HoraFinComida, ''00:00'') <> ISNULL(Source.HoraFinComida, ''00:00'')
            ) THEN
                UPDATE SET
                    Target.EsDiaLaboral = Source.EsDiaLaboral,
                    Target.HoraEntrada = Source.HoraEntrada,
                    Target.HoraSalida = Source.HoraSalida,
                    Target.HoraInicioComida = Source.HoraInicioComida,
                    Target.HoraFinComida = Source.HoraFinComida
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (HorarioId, DiaSemana, EsDiaLaboral, HoraEntrada, HoraSalida, HoraInicioComida, HoraFinComida)
                VALUES (Source.HorarioId, Source.DiaSemana, Source.EsDiaLaboral, Source.HoraEntrada, Source.HoraSalida, Source.HoraInicioComida, Source.HoraFinComida);';
            EXEC sp_executesql @SQL;
        END
        -- 5. Sincronización de Empleados
        PRINT 'Sincronizando Empleados (con todos los campos)...';
        IF (SELECT ConfigValue FROM dbo.SISConfiguracion WHERE ConfigKey = 'SyncEmpleados') = 'true'
        BEGIN
            SET @SQL = CAST('' AS NVARCHAR(MAX)) + '
            ;WITH ImagenesUnicas AS (
                SELECT folio,imagen, ROW_NUMBER() OVER(PARTITION BY folio ORDER BY (SELECT NULL)) AS rn
                FROM ' + QUOTENAME(@SourceDB) + '.dbo.imagenes
                WHERE transaccion = ''9'' AND tipo_imagen = ''2''
            )
            MERGE dbo.Empleados AS Target
            USING (
                SELECT
                    RTRIM(e.empleado) AS empleado,
                    RTRIM(e.nombre_completo) AS nombre_completo,
                    RTRIM(e.nombre) AS nombres,
                    RTRIM(e.ap_paterno) AS apellido_paterno,
                    RTRIM(e.ap_materno) AS apellido_materno,
                    e.fecha_nacimiento,
                    e.fecha_ingreso,
                    e.fecha_baja,
                    e.sexo,
                    RTRIM(e.reg_imss) AS reg_imss,
                    RTRIM(e.curp) AS curp,
                    RTRIM(e.rfc) AS rfc,
                    d.DepartamentoId AS LocalDeptId,
                    gn.GrupoNominaId AS LocalGrupoId,
                    p.PuestoId AS LocalPuestoId,
                    h.HorarioId AS LocalHorarioId,
                    est.EstablecimientoId AS LocalEstabId,
                    i.imagen,
                    (CASE WHEN e.status_empleado = ''1'' THEN 1 ELSE 0 END) AS EsActivo
                FROM ' + QUOTENAME(@SourceDB) + '.dbo.empleados e
                LEFT JOIN ImagenesUnicas i ON RTRIM(e.empleado) = i.folio AND i.rn = 1
                LEFT JOIN dbo.CatalogoDepartamentos d ON RTRIM(e.departamento) = d.CodRef        
                LEFT JOIN dbo.CatalogoGruposNomina gn ON RTRIM(e.grupo_nomina) = gn.CodRef       
                LEFT JOIN dbo.CatalogoPuestos p ON RTRIM(e.puesto) = p.CodRef
                LEFT JOIN dbo.CatalogoHorarios h ON RTRIM(e.horario) = h.CodRef
                LEFT JOIN dbo.CatalogoEstablecimientos est ON RTRIM(e.cod_estab) = est.CodRef    
            ) AS Source ON Target.CodRef = Source.empleado
' + '
            WHEN MATCHED THEN
                UPDATE SET
                    Target.NombreCompleto = Source.nombre_completo,
                    Target.Nombres = Source.nombres,
                    Target.ApellidoPaterno = Source.apellido_paterno,
                    Target.ApellidoMaterno = Source.apellido_materno,
                    Target.FechaNacimiento = Source.fecha_nacimiento,
                    Target.FechaIngreso = Source.fecha_ingreso,
                    Target.Sexo = Source.sexo,
                    Target.NSS = Source.reg_imss,
                    Target.CURP = Source.curp,
                    Target.RFC = Source.rfc,
                    Target.DepartamentoId = Source.LocalDeptId,
                    Target.GrupoNominaId = Source.LocalGrupoId,
                    Target.PuestoId = Source.LocalPuestoId,
                    Target.HorarioIdPredeterminado = Source.LocalHorarioId,
                    Target.Imagen = Source.imagen,
                    Target.Activo = Source.EsActivo,
                    Target.FechaBaja = Source.fecha_baja,
                    Target.EstablecimientoId = Source.LocalEstabId
' + '
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (
                    CodRef, Pim, NombreCompleto, Nombres, ApellidoPaterno, ApellidoMaterno, FechaNacimiento,
                    FechaIngreso, Sexo, NSS, CURP, RFC, DepartamentoId, GrupoNominaId,
                    PuestoId, HorarioIdPredeterminado, Imagen, Activo, FechaBaja, EstablecimientoId
                )
                VALUES (
                    Source.empleado, Source.empleado, Source.nombre_completo, Source.nombres, Source.apellido_paterno, Source.apellido_materno, Source.fecha_nacimiento,
                    Source.fecha_ingreso,
                    Source.sexo, Source.reg_imss, Source.curp, Source.rfc, Source.LocalDeptId, Source.LocalGrupoId,
                    Source.LocalPuestoId, Source.LocalHorarioId, Source.imagen, Source.EsActivo, Source.fecha_baja, Source.LocalEstabId
                )
            WHEN NOT MATCHED BY SOURCE THEN
                UPDATE SET Target.Activo = 0;';
            EXEC sp_executesql @SQL;
        END
        COMMIT TRANSACTION;
        PRINT 'Proceso de sincronización completado con éxito.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        PRINT 'Error durante la sincronización: ' + ERROR_MESSAGE();
        THROW;
    END CATCH
END
GO