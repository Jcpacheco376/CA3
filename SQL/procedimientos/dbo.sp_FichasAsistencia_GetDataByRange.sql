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
		
		-- 1. Auto-Generación inteligente 
		IF NOT EXISTS (SELECT 1 FROM dbo.FichaAsistencia WHERE Fecha BETWEEN @FechaInicio AND @FechaFin)
        begin 
			EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] @FechaInicio, @FechaFin, @UsuarioId;
		end
		else
		begin
			DECLARE @CurrentDate DATE = @FechaInicio;

			WHILE @CurrentDate <= @FechaFin
			BEGIN
				-- Verificar si YA existe ficha para este usuario y esta fecha exacta
				IF EXISTS (
					SELECT 1
					FROM dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) se
					WHERE NOT EXISTS (
						SELECT 1
						FROM dbo.FichaAsistencia fa
						WHERE fa.EmpleadoId = se.EmpleadoId
						  AND fa.Fecha = @CurrentDate
					)
				)

				BEGIN
					-- Procesar solo este día faltante
					EXEC [dbo].[sp_FichasAsistencia_ProcesarChecadas] 
						@CurrentDate, 
						@CurrentDate, 
						@UsuarioId; 
				END

				-- Avanzar al siguiente día
				SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate);
			END
	  end
	 	    
    -- 2. Filtros JSON
    DECLARE @Deptos TABLE (Id INT); IF @DepartamentoFiltro IS NOT NULL AND @DepartamentoFiltro <> '[]' INSERT INTO @Deptos SELECT Id FROM OPENJSON(@DepartamentoFiltro) WITH (Id INT '$');
    DECLARE @Grupos TABLE (Id INT); IF @GrupoNominaFiltro IS NOT NULL AND @GrupoNominaFiltro <> '[]' INSERT INTO @Grupos SELECT Id FROM OPENJSON(@GrupoNominaFiltro) WITH (Id INT '$');
    DECLARE @Puestos TABLE (Id INT); IF @PuestoFiltro IS NOT NULL AND @PuestoFiltro <> '[]' INSERT INTO @Puestos SELECT Id FROM OPENJSON(@PuestoFiltro) WITH (Id INT '$');
    DECLARE @Estabs TABLE (Id INT); IF @EstablecimientoFiltro IS NOT NULL AND @EstablecimientoFiltro <> '[]' INSERT INTO @Estabs SELECT Id FROM OPENJSON(@EstablecimientoFiltro) WITH (Id INT '$');

    -- 3. Consulta Principal
    SELECT 
        e.EmpleadoId, 
        e.CodRef, 
        e.NombreCompleto,
        
        ISNULL(h.HorarioId, 0) AS horario, 
        
        ISNULL(d.Nombre, 'Sin Depto.') AS departamento_nombre, 
        ISNULL(p.Nombre, 'Sin Puesto') AS puesto_descripcion, 
        e.DepartamentoId, e.GrupoNominaId, e.PuestoId, e.EstablecimientoId, e.FechaNacimiento,
        
        ISNULL(JsonData.FichasSemana, '[]') AS FichasSemana

    FROM dbo.Empleados e
    INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
    LEFT JOIN dbo.CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN dbo.CatalogoPuestos p ON e.PuestoId = p.PuestoId
    LEFT JOIN dbo.CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
    
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
                
                -- Cálculo de Minutos de Comida
                ISNULL((
                    SELECT DATEDIFF(MINUTE, hd.HoraInicioComida, hd.HoraFinComida)
                    FROM dbo.CatalogoHorariosDetalle hd
                    WHERE hd.HorarioId = fa.HorarioId
                      AND hd.DiaSemana = DATEPART(WEEKDAY, fa.Fecha)
                      AND hd.HoraInicioComida IS NOT NULL 
                      AND hd.HoraFinComida IS NOT NULL
                ), 0) as MinutosComida,

                -- Info Visual de Estatus
                estChec.Abreviatura as EstatusChecadorAbrev, 
                estChec.ColorUI as EstatusChecadorColor,
                estMan.Abreviatura as EstatusManualAbrev,
                estMan.ColorUI as EstatusSupervisorColor,
                -- -----------------------------------------------------------
                -- LÓGICA ACTUALIZADA: Usando TipoCalculoId
                -- -----------------------------------------------------------
                CASE 
                    WHEN ISNULL(estMan.TipoCalculoId, estChec.TipoCalculoId) = 'FALTA'       THEN 'F'
                    WHEN ISNULL(estMan.TipoCalculoId, estChec.TipoCalculoId) = 'DESCANSO'    THEN 'D'
                    WHEN ISNULL(estMan.TipoCalculoId, estChec.TipoCalculoId) = 'RETARDO'     THEN 'R'
                    WHEN ISNULL(estMan.TipoCalculoId, estChec.TipoCalculoId) = 'ASISTENCIA'  THEN 'A'
                    WHEN ISNULL(estMan.TipoCalculoId, estChec.TipoCalculoId) = 'SIN_HORARIO' THEN 'S'
                    WHEN ISNULL(estMan.TipoCalculoId, estChec.TipoCalculoId) = 'INCOMPLETA'  THEN 'I' -- Opcional si usas I
                    ELSE 'O'
                END as Clasificacion,

                'Auto' as TipoEntrada, 
                'Auto' as TipoSalida, 
                'Pendiente' as EstatusAutorizacion

            FROM dbo.FichaAsistencia fa
            -- Seguridad a nivel de fila también en las fichas
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


