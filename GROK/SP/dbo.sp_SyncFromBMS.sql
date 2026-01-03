IF OBJECT_ID('dbo.sp_SyncFromBMS') IS NOT NULL      DROP PROCEDURE dbo.sp_SyncFromBMS;
GO
CREATE PROCEDURE [dbo].[sp_SyncFromBMS]
AS
BEGIN
    SET NOCOUNT ON;
    PRINT 'Iniciando proceso de sincronización desde BMSJS (Local)...';

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Sincronización de CatalogoDepartamentos
        IF (SELECT ConfigValue FROM dbo.ConfiguracionSistema WHERE ConfigKey = 'SyncDepartamentos') = 'true'
        BEGIN
			PRINT 'Sincronizando CatalogoDepartamentos...';
			MERGE dbo.CatalogoDepartamentos AS Target
			USING (
                SELECT RTRIM(departamento) AS departamento, RTRIM(nombre) AS nombre, RTRIM(abreviatura) AS abreviatura, status 
                FROM bmsjs.dbo.departamentos 
                WHERE status='V' 
            ) AS Source ON Target.CodRef = Source.departamento
			WHEN MATCHED AND (Target.Nombre <> Source.nombre OR Target.Abreviatura <> Source.abreviatura OR Target.Activo <> (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END)) THEN
				UPDATE SET Target.Nombre = Source.nombre, Target.Abreviatura = Source.abreviatura, Target.Activo = (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END)
			WHEN NOT MATCHED BY TARGET THEN
				INSERT (CodRef, Nombre, Abreviatura, Activo) VALUES (Source.departamento, Source.nombre, Source.abreviatura, (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END))
			WHEN NOT MATCHED BY SOURCE THEN
				UPDATE SET Target.Activo = 0;
		END

        -- 2. Sincronización de CatalogoGruposNomina 
        IF (SELECT ConfigValue FROM dbo.ConfiguracionSistema WHERE ConfigKey = 'SyncGruposNomina') = 'true'
        BEGIN
			PRINT 'Sincronizando CatalogoGruposNomina...';
			MERGE dbo.CatalogoGruposNomina AS Target
			USING (
                SELECT RTRIM(grupo_nomina) AS grupo_nomina, RTRIM(nombre) AS nombre, RTRIM(abreviatura) AS abreviatura, status 
                FROM bmsjs.dbo.grupos_nomina 
                WHERE status='V' 
            ) AS Source ON Target.CodRef = Source.grupo_nomina
			WHEN MATCHED AND (Target.Nombre <> Source.nombre OR Target.Abreviatura <> Source.abreviatura OR Target.Activo <> (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END)) THEN
				UPDATE SET Target.Nombre = Source.nombre, Target.Abreviatura = Source.abreviatura, Target.Activo = (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END)
			WHEN NOT MATCHED BY TARGET THEN
				INSERT (CodRef, Nombre, Abreviatura, Activo) VALUES (Source.grupo_nomina, Source.nombre, Source.abreviatura, (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END))
			WHEN NOT MATCHED BY SOURCE THEN
				UPDATE SET Target.Activo = 0;
		END

        -- 3. Sincronización de CatalogoPuestos 
        IF (SELECT ConfigValue FROM dbo.ConfiguracionSistema WHERE ConfigKey = 'SyncPuestos') = 'true'
        BEGIN
			PRINT 'Sincronizando CatalogoPuestos...';
			MERGE dbo.CatalogoPuestos AS Target
			USING (
                SELECT RTRIM(puesto) AS puesto, RTRIM(nombre) AS nombre, status 
                FROM bmsjs.dbo.puestos 
            ) AS Source ON Target.CodRef = Source.puesto
			WHEN MATCHED AND (Target.Nombre <> Source.nombre OR Target.Activo <> (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END)) THEN
				UPDATE SET Target.Nombre = Source.nombre, Target.Activo = (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END)
			WHEN NOT MATCHED BY TARGET THEN
				INSERT (CodRef, Nombre, Activo) VALUES (Source.puesto, Source.nombre, (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END))
			WHEN NOT MATCHED BY SOURCE THEN
				UPDATE SET Target.Activo = 0;
		END

        -- 4. Sincronización de CatalogoHorarios 
		IF (SELECT ConfigValue FROM dbo.ConfiguracionSistema WHERE ConfigKey = 'SyncHorarios') = 'true'
        BEGIN
            PRINT 'Sincronizando CatalogoHorarios (Cabeceras)...';
			MERGE dbo.CatalogoHorarios AS Target
            USING (
                SELECT RTRIM(horario) AS horario, RTRIM(nombre) AS nombre, minutos_tolerancia, status 
                FROM bmsjs.dbo.horarios 
                -- ORDER BY TRY_CAST(horario AS INT) --<-- SE ELIMINA ESTA LÍNEA
            ) AS Source ON Target.CodRef = Source.horario
            WHEN MATCHED AND (Target.Nombre <> Source.nombre OR Target.MinutosTolerancia <> Source.minutos_tolerancia OR Target.Activo <> (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END)) THEN
                UPDATE SET Target.Nombre = Source.nombre, Target.MinutosTolerancia = Source.minutos_tolerancia, Target.Activo = (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END)
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (CodRef, Abreviatura, Nombre, MinutosTolerancia, Activo) 
                VALUES (Source.horario, '', Source.nombre, Source.minutos_tolerancia, (CASE WHEN Source.status = 'V' THEN 1 ELSE 0 END));
            
			-- (El resto del merge de CatalogoHorariosDetalle estaba bien, no tenía ORDER BY)
            PRINT 'Sincronizando CatalogoHorariosDetalle (Detalles de días)...';
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
                FROM bmsjs.dbo.mhorarios m
                JOIN dbo.CatalogoHorarios ch ON RTRIM(m.horario) = ch.CodRef
            ) AS Source
            ON (Target.HorarioId = Source.HorarioId AND Target.DiaSemana = Source.DiaSemana)
            WHEN MATCHED AND (
                Target.EsDiaLaboral <> Source.EsDiaLaboral OR
                ISNULL(Target.HoraEntrada, '00:00') <> ISNULL(Source.HoraEntrada, '00:00') OR
                ISNULL(Target.HoraSalida, '00:00') <> ISNULL(Source.HoraSalida, '00:00') OR
                ISNULL(Target.HoraInicioComida, '00:00') <> ISNULL(Source.HoraInicioComida, '00:00') OR
                ISNULL(Target.HoraFinComida, '00:00') <> ISNULL(Source.HoraFinComida, '00:00')
  	      ) THEN
                UPDATE SET
                    Target.EsDiaLaboral = Source.EsDiaLaboral, Target.HoraEntrada = Source.HoraEntrada,
                    Target.HoraSalida = Source.HoraSalida, Target.HoraInicioComida = Source.HoraInicioComida,
                    Target.HoraFinComida = Source.HoraFinComida
          	WHEN NOT MATCHED BY TARGET THEN
                INSERT (HorarioId, DiaSemana, EsDiaLaboral, HoraEntrada, HoraSalida, HoraInicioComida, HoraFinComida)
                VALUES (Source.HorarioId, Source.DiaSemana, Source.EsDiaLaboral, Source.HoraEntrada, Source.HoraSalida, Source.HoraInicioComida, Source.HoraFinComida);
		END

-- 5. Sincronización de Empleados
 		PRINT 'Sincronizando Empleados (con todos los campos)...';
 		IF (SELECT ConfigValue FROM dbo.ConfiguracionSistema WHERE ConfigKey = 'SyncEmpleados') = 'true'
 		BEGIN
			;WITH ImagenesUnicas AS (
				SELECT 
					folio, 
					imagen,
					ROW_NUMBER() OVER(PARTITION BY folio ORDER BY (SELECT NULL)) as rn
				FROM bmsjs.dbo.imagenes 
				WHERE transaccion='9' AND tipo_imagen='2'
			)
			MERGE dbo.Empleados AS Target
			USING (
				SELECT 
					RTRIM(e.empleado) AS empleado, 
					RTRIM(e.nombre_completo) AS nombre_completo, 
					e.fecha_nacimiento, 
					e.fecha_ingreso, 
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
					e.status_empleado
				FROM bmsjs.dbo.empleados e
				LEFT JOIN ImagenesUnicas i ON RTRIM(e.empleado) = i.folio AND i.rn = 1
				LEFT JOIN dbo.CatalogoDepartamentos d ON RTRIM(e.departamento) = d.CodRef
				LEFT JOIN dbo.CatalogoGruposNomina gn ON RTRIM(e.grupo_nomina) = gn.CodRef
				LEFT JOIN dbo.CatalogoPuestos p ON RTRIM(e.puesto) = p.CodRef
				LEFT JOIN dbo.CatalogoHorarios h ON RTRIM(e.horario) = h.CodRef
				

				LEFT JOIN dbo.CatalogoEstablecimientos est ON RTRIM(e.cod_estab) = est.CodRef 
			) AS Source ON Target.CodRef = Source.empleado
			WHEN MATCHED THEN
				UPDATE SET 
					Target.NombreCompleto = Source.nombre_completo, 
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
					Target.Activo = (CASE WHEN Source.status_empleado = '1' THEN 1 ELSE 0 END),
					

					Target.EstablecimientoId = Source.LocalEstabId 

			WHEN NOT MATCHED BY TARGET THEN
				INSERT (
					CodRef, NombreCompleto, FechaNacimiento, FechaIngreso, Sexo, NSS, CURP, RFC, 
					DepartamentoId, GrupoNominaId, PuestoId, HorarioIdPredeterminado, Imagen, Activo, 
					EstablecimientoId 
				)
				VALUES (
					Source.empleado, Source.nombre_completo, Source.fecha_nacimiento, Source.fecha_ingreso, Source.sexo, Source.reg_imss, Source.curp, Source.rfc, 
					Source.LocalDeptId, Source.LocalGrupoId, Source.LocalPuestoId, Source.LocalHorarioId, Source.imagen, (CASE WHEN Source.status_empleado = '1' THEN 1 ELSE 0 END),
					
					Source.LocalEstabId 
				)
			WHEN NOT MATCHED BY SOURCE THEN
				UPDATE SET Target.Activo = 0;
		END
        COMMIT TRANSACTION;
        PRINT 'Proceso de sincronización completado con éxito.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        PRINT 'Error durante la sincronización: ' + ERROR_MESSAGE();
        -- Lanzar el error para que sea capturado por el job
        THROW;
    END CATCH
END


