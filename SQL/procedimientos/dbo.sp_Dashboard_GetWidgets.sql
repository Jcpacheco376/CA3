-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Dashboard_GetWidgets]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Dashboard_GetWidgets]
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
    -- WIDGET: ESTAD�STICAS DEL D�A (DailyStats & Distribution)
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
		/*
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
        WHERE SinHorario = 1;*/

        -- Consulta principal con JOIN en lugar de subquery
		SELECT
            (SELECT COUNT(*) FROM Empleados WHERE Activo = 1) AS TotalPlantilla,            
            -- Presentes: Tienen entrada Y el estatus es de tipo ASISTENCIA o RETARDO
            SUM(CASE WHEN FA.HoraEntrada IS NOT NULL AND (CEA.TipoCalculoId IN ('ASISTENCIA', 'RETARDO')) THEN 1 ELSE 0 END) AS Presentes,          
            -- Retardos: Espec�ficamente tipo RETARDO
            SUM(CASE WHEN CEA.TipoCalculoId = 'RETARDO' THEN 1 ELSE 0 END) AS Retardos,          
            -- Ausencias: Tipo FALTA
            SUM(CASE WHEN CEA.TipoCalculoId = 'FALTA' THEN 1 ELSE 0 END) AS Ausencias,          
            -- Sin Horario
            SUM(CASE WHEN CEA.TipoCalculoId = 'SIN_HORARIO' THEN 1 ELSE 0 END) AS SinHorario

        FROM @EmpleadosPermitidos P
        LEFT JOIN FichaAsistencia FA  ON P.EmpleadoId = FA.EmpleadoId 
        INNER JOIN CatalogoEstatusAsistencia CEA ON FA.EstatusChecadorId = CEA.EstatusId
		WHERE FA.Fecha = @FechaHoy
       /* LEFT JOIN @EstatusRetardo ER 
            ON FA.EstatusChecadorId = ER.EstatusId
		 LEFT JOIN @EstatusSinHorario SH 
            ON FA.EstatusChecadorId = SH.EstatusId      */	      
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
                    WHEN FA.HoraEntrada IS NOT NULL OR EA.TipoCalculoId = 'ASISTENCIA' THEN 1
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
    -- WIDGET: CENTRO DE ACCI�N (ActionCenter)
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
    -- WIDGET: ESTATUS N�MINA (PayrollStatus)
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

        -- 1. Identificar Grupos de N�mina visibles para el usuario (seg�n sus empleados permitidos)
        INSERT INTO #PayrollStatus (GrupoNominaId, NombreGrupo, PeriodoConfig)
        SELECT DISTINCT 
            GN.GrupoNominaId, 
            GN.Nombre, 
            ISNULL(GN.Periodo, 'QUINCENAL') -- Default a Quincenal si es nulo
        FROM CatalogoGruposNomina GN
        INNER JOIN Empleados E ON GN.GrupoNominaId = E.GrupoNominaId
        INNER JOIN @EmpleadosPermitidos P ON E.EmpleadoId = P.EmpleadoId
        WHERE GN.Activo = 1;

        -- 2. Calcular Fechas de Periodo Din�micamente seg�n el tipo de n�mina
        UPDATE #PayrollStatus
        SET InicioPeriodo = CASE 
                WHEN PeriodoConfig = 'SEMANAL' THEN 
                    -- L�gica Semanal: Lunes de la semana actual
                    DATEADD(week, DATEDIFF(week, 0, @Hoy), 0)
                ELSE 
                    -- L�gica Quincenal (Por defecto)
                    CASE WHEN DAY(@Hoy) <= 15 THEN DATEFROMPARTS(YEAR(@Hoy), MONTH(@Hoy), 1)
                         ELSE DATEFROMPARTS(YEAR(@Hoy), MONTH(@Hoy), 16) END
            END,
            FinPeriodo = CASE 
                WHEN PeriodoConfig = 'SEMANAL' THEN 
                    -- L�gica Semanal: Domingo de la semana actual
                    DATEADD(week, DATEDIFF(week, 0, @Hoy), 6)
                ELSE 
                    -- L�gica Quincenal
                    CASE WHEN DAY(@Hoy) <= 15 THEN DATEFROMPARTS(YEAR(@Hoy), MONTH(@Hoy), 15)
                         ELSE EOMONTH(@Hoy) END
            END;

        -- 3. Calcular M�tricas de Progreso (La parte pesada)
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

        -- B) Calcular Fichas Esperadas (D�as en periodo * Empleados)
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
            
            -- Progreso de Tiempo (Cu�nto del periodo ha pasado hoy)
            ROUND((CAST(DATEDIFF(DAY, InicioPeriodo, @Hoy) AS FLOAT) / 
             NULLIF(DATEDIFF(DAY, InicioPeriodo, FinPeriodo) + 1, 0)) * 100, 1) AS ProgresoTiempo,

            -- Progreso de Captura (Cu�nto trabajo real est� terminado)
            CASE 
                WHEN TotalFichasEsperadas = 0 THEN 0
                ELSE ROUND((CAST(FichasListas AS FLOAT) / TotalFichasEsperadas) * 100, 1)
            END AS ProgresoCaptura
            
        FROM #PayrollStatus
        ORDER BY NombreGrupo;

        DROP TABLE #PayrollStatus;
    END

END
GO