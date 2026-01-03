IF OBJECT_ID('dbo.sp_Dashboard_GetWidgets') IS NOT NULL      DROP PROCEDURE dbo.sp_Dashboard_GetWidgets;
GO

CREATE   PROCEDURE [dbo].[sp_Dashboard_GetWidgets]
    @UsuarioId INT,
    @TipoWidget VARCHAR(50) -- 'STATS', 'TRENDS', 'ACTIONS', 'PAYROLL'
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. OBTENER EMPLEADOS PERMITIDOS (Seguridad RLS)
    DECLARE @EmpleadosPermitidos TABLE (EmpleadoId INT);
    INSERT INTO @EmpleadosPermitidos
    SELECT EmpleadoId FROM dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId);

    -- =================================================================================
    -- WIDGET: ESTADÍSTICAS DEL DÍA (DailyStats & Distribution)
    -- =================================================================================
    IF @TipoWidget = 'STATS'
    BEGIN
        DECLARE @FechaHoy DATE = CAST(GETDATE() AS DATE);
       
        -- Total plantilla activa y permitida
        DECLARE @TotalPlantilla INT;
        SELECT @TotalPlantilla = COUNT(*)
        FROM Empleados E
        INNER JOIN @EmpleadosPermitidos P ON E.EmpleadoId = P.EmpleadoId
        WHERE E.Activo = 1;

        -- Tabla temporal con estatus que son retardo
        DECLARE @EstatusRetardo TABLE (EstatusId INT PRIMARY KEY);
        INSERT INTO @EstatusRetardo
        SELECT EstatusId 
        FROM CatalogoEstatusAsistencia 
        WHERE EsRetardo = 1;

		-- Tabla temporal con estatus que son sin horario
        DECLARE @EstatusSinHorario TABLE (EstatusId INT PRIMARY KEY);
        INSERT INTO @EstatusSinHorario
        SELECT EstatusId 
        FROM CatalogoEstatusAsistencia 
        WHERE SinHorario = 1;

        -- Consulta principal con JOIN en lugar de subquery
        SELECT
            @TotalPlantilla AS TotalPlantilla,          
            -- Presentes
            SUM(CASE WHEN FA.HoraEntrada IS NOT NULL AND ER.EstatusId IS  NULL THEN 1 ELSE 0 END) AS Presentes,        
            -- Retardos
            SUM(CASE WHEN ER.EstatusId IS NOT NULL THEN 1 ELSE 0 END) AS Retardos,          
            -- Ausencias
            SUM(CASE WHEN FA.HoraEntrada IS NULL AND SH.EstatusId IS NULL  THEN 1 ELSE 0 END) AS Ausencias,
			-- Sin horario
           SUM(CASE WHEN SH.EstatusId IS NOT NULL THEN 1 ELSE 0 END) AS SinHorario

        FROM @EmpleadosPermitidos P
        LEFT JOIN FichaAsistencia FA 
            ON P.EmpleadoId = FA.EmpleadoId 
           AND FA.Fecha = @FechaHoy
        LEFT JOIN @EstatusRetardo ER 
            ON FA.EstatusChecadorId = ER.EstatusId
		 LEFT JOIN @EstatusSinHorario SH 
            ON FA.EstatusChecadorId = SH.EstatusId      	      
    END

    -- =================================================================================
    -- WIDGET: TENDENCIA SEMANAL (WeeklyTrends)
    -- =================================================================================
    ELSE IF @TipoWidget = 'TRENDS'
    BEGIN
        DECLARE @FechaFin DATE = CAST(GETDATE() AS DATE);
        DECLARE @FechaInicio DATE = DATEADD(DAY, -6, @FechaFin);

        ;WITH DateRange AS (
            SELECT @FechaInicio AS Fecha
            UNION ALL
            SELECT DATEADD(DAY, 1, Fecha) 
            FROM DateRange 
            WHERE Fecha < @FechaFin
        ),
        StatsDiarias AS (
            SELECT
                DR.Fecha,
                COUNT(P.EmpleadoId) AS TotalEsperado,
                SUM(CASE
                    WHEN FA.HoraEntrada IS NOT NULL OR EA.EsAsistencia = 1 THEN 1
                    ELSE 0
                END) AS Asistencias
            FROM DateRange DR
            CROSS JOIN @EmpleadosPermitidos P
            LEFT JOIN FichaAsistencia FA 
                ON P.EmpleadoId = FA.EmpleadoId 
               AND FA.Fecha = DR.Fecha
            LEFT JOIN CatalogoEstatusAsistencia EA 
                ON FA.EstatusChecadorId = EA.EstatusId
            GROUP BY DR.Fecha
        )
        SELECT
            Fecha,
            CASE
                WHEN TotalEsperado = 0 THEN 0
                ELSE ROUND((CAST(Asistencias AS DECIMAL(10,2)) / TotalEsperado) * 100, 2)
            END AS PorcentajeAsistencia
        FROM StatsDiarias
        ORDER BY Fecha ASC;
    END

    -- =================================================================================
    -- WIDGET: CENTRO DE ACCIÓN (ActionCenter)
    -- =================================================================================
    ELSE IF @TipoWidget = 'ACTIONS'
    BEGIN
        SELECT TOP 50
            I.IncidenciaId,
            'incidencia' AS Tipo,
            E.NombreCompleto AS Usuario,
            TI.Nombre AS Descripcion,
            I.FechaCreacion AS Fecha,
            'medium' AS Prioridad,
            I.Estado
        FROM Incidencias I
        --INNER JOIN IncidenciasBitacora B on i.IncidenciaId=B.IncidenciaId
		INNER JOIN Empleados E ON I.EmpleadoId = E.EmpleadoId
        INNER JOIN CatalogoTiposIncidencia TI ON I.TipoIncidenciaId = TI.TipoIncidenciaId
        INNER JOIN @EmpleadosPermitidos P ON E.EmpleadoId = P.EmpleadoId
        
		WHERE (I.Estado IN ('Pendiente', 'Nueva') AND I.IncidenciaId IN ( SELECT IncidenciaId FROM IncidenciasBitacora WHERE UsuarioId=@UsuarioId ) )
		OR  (I.Estado IN ('Asignada')  and i.AsignadoAUsuarioId= @UsuarioId )
        ORDER BY I.FechaCreacion DESC;
    END

    -- =================================================================================
    -- WIDGET: ESTATUS NÓMINA (PayrollStatus)
    -- =================================================================================
    ELSE IF @TipoWidget = 'PAYROLL'
    BEGIN
        DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
        
        -- Tabla temporal para procesar cada grupo de forma independiente
        CREATE TABLE #PayrollStatus (
            GrupoNominaId INT,
            NombreGrupo VARCHAR(100),
            PeriodoConfig VARCHAR(50), -- 'SEMANAL', 'QUINCENAL', etc.
            InicioPeriodo DATE,
            FinPeriodo DATE,
            TotalEmpleados INT DEFAULT 0,
            TotalFichasEsperadas INT DEFAULT 0,
            FichasListas INT DEFAULT 0
        );

        -- 1. Identificar Grupos de Nómina visibles para el usuario (según sus empleados permitidos)
        INSERT INTO #PayrollStatus (GrupoNominaId, NombreGrupo, PeriodoConfig)
        SELECT DISTINCT 
            GN.GrupoNominaId, 
            GN.Nombre, 
            ISNULL(GN.Periodo, 'QUINCENAL') -- Default a Quincenal si es nulo
        FROM CatalogoGruposNomina GN
        INNER JOIN Empleados E ON GN.GrupoNominaId = E.GrupoNominaId
        INNER JOIN @EmpleadosPermitidos P ON E.EmpleadoId = P.EmpleadoId
        WHERE GN.Activo = 1;

        -- 2. Calcular Fechas de Periodo Dinámicamente según el tipo de nómina
        UPDATE #PayrollStatus
        SET InicioPeriodo = CASE 
                WHEN PeriodoConfig = 'SEMANAL' THEN 
                    -- Lógica Semanal: Lunes de la semana actual
                    DATEADD(week, DATEDIFF(week, 0, @Hoy), 0)
                ELSE 
                    -- Lógica Quincenal (Por defecto)
                    CASE WHEN DAY(@Hoy) <= 15 THEN DATEFROMPARTS(YEAR(@Hoy), MONTH(@Hoy), 1)
                         ELSE DATEFROMPARTS(YEAR(@Hoy), MONTH(@Hoy), 16) END
            END,
            FinPeriodo = CASE 
                WHEN PeriodoConfig = 'SEMANAL' THEN 
                    -- Lógica Semanal: Domingo de la semana actual
                    DATEADD(week, DATEDIFF(week, 0, @Hoy), 6)
                ELSE 
                    -- Lógica Quincenal
                    CASE WHEN DAY(@Hoy) <= 15 THEN DATEFROMPARTS(YEAR(@Hoy), MONTH(@Hoy), 15)
                         ELSE EOMONTH(@Hoy) END
            END;

        -- 3. Calcular Métricas de Progreso (La parte pesada)
        -- Usamos un cursor o un update basado en set para contar
        
        -- A) Contar Empleados por Grupo (dentro de los permitidos)
        UPDATE PS
        SET TotalEmpleados = (
            SELECT COUNT(DISTINCT E.EmpleadoId)
            FROM Empleados E
            INNER JOIN @EmpleadosPermitidos P ON E.EmpleadoId = P.EmpleadoId
            WHERE E.GrupoNominaId = PS.GrupoNominaId AND E.Activo = 1
        )
        FROM #PayrollStatus PS;

        -- B) Calcular Fichas Esperadas (Días en periodo * Empleados)
        UPDATE #PayrollStatus
        SET TotalFichasEsperadas = TotalEmpleados * (DATEDIFF(DAY, InicioPeriodo, FinPeriodo) + 1);

        -- C) Contar Fichas "Listas" (Progreso Real)
        -- Criterio: Estado BLOQUEADO o (VALIDADO sin incidencias activas)
        UPDATE PS
        SET FichasListas = ISNULL((
            SELECT COUNT(*)
            FROM FichaAsistencia FA
            INNER JOIN Empleados E ON FA.EmpleadoId = E.EmpleadoId
            INNER JOIN @EmpleadosPermitidos P ON E.EmpleadoId = P.EmpleadoId
            WHERE E.GrupoNominaId = PS.GrupoNominaId
              AND FA.Fecha BETWEEN PS.InicioPeriodo AND PS.FinPeriodo
              AND (
                  FA.Estado = 'BLOQUEADO' 
                  OR (FA.Estado = 'VALIDADO' AND FA.IncidenciaActivaId IS NULL)
              )
        ), 0)
        FROM #PayrollStatus PS;

        -- 4. Seleccionar Resultado Final
        SELECT 
            NombreGrupo,
            PeriodoConfig,
            InicioPeriodo,
            FinPeriodo,
            DATEDIFF(DAY, @Hoy, FinPeriodo) AS DiasRestantes,
            
            -- Progreso de Tiempo (Cuánto del periodo ha pasado hoy)
            ROUND((CAST(DATEDIFF(DAY, InicioPeriodo, @Hoy) AS FLOAT) / 
             NULLIF(DATEDIFF(DAY, InicioPeriodo, FinPeriodo) + 1, 0)) * 100, 1) AS ProgresoTiempo,

            -- Progreso de Captura (Cuánto trabajo real está terminado)
            CASE 
                WHEN TotalFichasEsperadas = 0 THEN 0
                ELSE ROUND((CAST(FichasListas AS FLOAT) / TotalFichasEsperadas) * 100, 1)
            END AS ProgresoCaptura
            
        FROM #PayrollStatus
        ORDER BY NombreGrupo;

        DROP TABLE #PayrollStatus;
    END

END
