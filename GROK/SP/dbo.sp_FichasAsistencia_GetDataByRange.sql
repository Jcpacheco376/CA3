IF OBJECT_ID('dbo.sp_FichasAsistencia_GetDataByRange') IS NOT NULL      DROP PROCEDURE dbo.sp_FichasAsistencia_GetDataByRange;
GO
CREATE PROCEDURE [dbo].[sp_FichasAsistencia_GetDataByRange]
    @UsuarioId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @DepartamentoFiltro NVARCHAR(MAX) = NULL,
    @GrupoNominaFiltro NVARCHAR(MAX) = NULL,
    @PuestoFiltro NVARCHAR(MAX) = NULL,
    @EstablecimientoFiltro NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET DATEFIRST 1; -- Lunes = 1

    -- 1. Auto-Generación
    IF NOT EXISTS (SELECT 1 FROM dbo.FichaAsistencia WHERE Fecha BETWEEN @FechaInicio AND @FechaFin)
        EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] @FechaInicio, @FechaFin, @UsuarioId;
		
    -- 2. Filtros
    DECLARE @Deptos TABLE (Id INT); IF @DepartamentoFiltro IS NOT NULL AND @DepartamentoFiltro <> '[]' INSERT INTO @Deptos SELECT Id FROM OPENJSON(@DepartamentoFiltro) WITH (Id INT '$');
    DECLARE @Grupos TABLE (Id INT); IF @GrupoNominaFiltro IS NOT NULL AND @GrupoNominaFiltro <> '[]' INSERT INTO @Grupos SELECT Id FROM OPENJSON(@GrupoNominaFiltro) WITH (Id INT '$');
    DECLARE @Puestos TABLE (Id INT); IF @PuestoFiltro IS NOT NULL AND @PuestoFiltro <> '[]' INSERT INTO @Puestos SELECT Id FROM OPENJSON(@PuestoFiltro) WITH (Id INT '$');
    DECLARE @Estabs TABLE (Id INT); IF @EstablecimientoFiltro IS NOT NULL AND @EstablecimientoFiltro <> '[]' INSERT INTO @Estabs SELECT Id FROM OPENJSON(@EstablecimientoFiltro) WITH (Id INT '$');

    -- 3. Consulta Principal usando OUTER APPLY para el JSON
    -- Esto soluciona el problema de alcance de 'e.EmpleadoId'
    SELECT 
        e.EmpleadoId, 
        e.CodRef, 
        e.NombreCompleto,
        
        -- CORRECCIÓN TIPO DATO: 0 en lugar de ''
        ISNULL(h.HorarioId, 0) AS horario, 
        
        ISNULL(d.Nombre, 'Sin Depto.') AS departamento_nombre, 
        ISNULL(p.Nombre, 'Sin Puesto') AS puesto_descripcion, 
        e.DepartamentoId, e.GrupoNominaId, e.PuestoId, e.EstablecimientoId, e.FechaNacimiento,
        
        -- El JSON viene de la subconsulta APPLY
        ISNULL(JsonData.FichasSemana, '[]') AS FichasSemana

    FROM dbo.Empleados e
	INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.CatalogoPuestos p ON e.PuestoId = p.PuestoId
    LEFT JOIN dbo.CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
    
    -- AQUÍ GENERAMOS EL JSON DE FORMA SEGURA Y CORRELACIONADA
    OUTER APPLY (
        SELECT (
            SELECT 
                fa.Fecha, 
                fa.HoraEntrada, 
                fa.HoraSalida, 
                fa.HorarioId, 
                fa.Comentarios, 
                fa.IncidenciaActivaId,
				fa.Estado,
				--fa.Bloqueada,
                -- Cálculo de Minutos de Comida (Para el cálculo de horas netas)
                ISNULL((
                    SELECT DATEDIFF(MINUTE, hd.HoraInicioComida, hd.HoraFinComida)
                    FROM dbo.CatalogoHorariosDetalle hd
                    WHERE hd.HorarioId = fa.HorarioId
                      AND hd.DiaSemana = DATEPART(WEEKDAY, fa.Fecha)
                      AND hd.HoraInicioComida IS NOT NULL 
                      AND hd.HoraFinComida IS NOT NULL
                ), 0) as MinutosComida,
                -- Estatus
                estChec.Abreviatura as EstatusChecadorAbrev, 
                estChec.ColorUI as EstatusChecadorColor,
                estMan.Abreviatura as EstatusManualAbrev,
                estMan.ColorUI as EstatusSupervisorColor,
                CASE 
					WHEN estMan.EsFalta = 1 THEN 'F'      -- F = Falta
					WHEN estMan.EsDescanso = 1 THEN 'D'   -- D = Descanso
					WHEN estMan.EsRetardo = 1 THEN 'R'    -- R = Retardo
					WHEN estMan.EsAsistencia = 1 THEN 'A' -- A = Asistencia
					WHEN estMan.SinHorario = 1 THEN 'S' -- A = Asistencia
					ELSE 'O'                              -- O = Otro/Neutro
				END as Clasificacion,
                -- Campos extra requeridos por el frontend (aunque sean fijos)
                'Auto' as TipoEntrada, 
                'Auto' as TipoSalida, 
                'Pendiente' as EstatusAutorizacion

            FROM dbo.FichaAsistencia fa
			INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
            LEFT JOIN dbo.CatalogoEstatusAsistencia estMan ON fa.EstatusManualId = estMan.EstatusId
            LEFT JOIN dbo.CatalogoEstatusAsistencia estChec ON fa.EstatusChecadorId = estChec.EstatusId
            WHERE fa.EmpleadoId = e.EmpleadoId 
              AND fa.Fecha BETWEEN @FechaInicio AND @FechaFin
            ORDER BY fa.Fecha
            FOR JSON PATH
        ) AS FichasSemana
    ) AS JsonData

    WHERE e.Activo = 1

      AND ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
      AND ((SELECT COUNT(*) FROM @Grupos) = 0 OR e.GrupoNominaId IN (SELECT Id FROM @Grupos))
      AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
      AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs))
    ORDER BY e.NombreCompleto;
END


