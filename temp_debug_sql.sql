
            ;WITH ImagenesUnicas AS (
                SELECT
                    folio,
                    imagen,
                    ROW_NUMBER() OVER(PARTITION BY folio ORDER BY (SELECT NULL)) AS rn
                FROM BMS.dbo.imagenes
                WHERE transaccion = '9' AND tipo_imagen = '2'
            )
            MERGE dbo.Empleados AS Target
            USING (
                SELECT
                    RTRIM(e.empleado) AS empleado,
                    RTRIM(e.nombre_completo) AS nombre_completo,
                    RTRIM(e.nombres) AS nombres,
                    RTRIM(e.ap_paterno) AS apellido_paterno,
                    RTRIM(e.ap_materno) AS apellido_materno,
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
                FROM BMS.dbo.empleados e
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
                    Target.Activo = (CASE WHEN Source.status_empleado = '1' THEN 1 ELSE 0 END),
                    Target.EstablecimientoId = Source.LocalEstabId
            WHEN NOT MATCHED BY TARGET THEN
                INSERT (
                    CodRef, NombreCompleto, Nombres, ApellidoPaterno, ApellidoMaterno, FechaNacimiento, FechaIngreso, Sexo, NSS, CURP, RFC, 
                    DepartamentoId, GrupoNominaId, PuestoId, HorarioIdPredeterminado, Imagen, Activo,
                    EstablecimientoId
                )
                VALUES (
                    Source.empleado, Source.nombre_completo, Source.nombres, Source.apellido_paterno, Source.apellido_materno, Source.fecha_nacimiento, Source.fecha_ingreso, Source.sexo, Source.reg_imss, Source.curp, Source.rfc,
                    Source.LocalDeptId, Source.LocalGrupoId, Source.LocalPuestoId, Source.LocalHorarioId, Source.imagen, (CASE WHEN Source.status_empleado = '1' THEN 1 ELSE 0 END),
                    Source.LocalEstabId
                )
            WHEN NOT MATCHED BY SOURCE THEN
                UPDATE SET Target.Activo = 0;
