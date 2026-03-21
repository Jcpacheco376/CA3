-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_GenerarSaldosBase]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Stored Procedure: [dbo].[sp_Vacaciones_GenerarSaldosBase]
-- Base de Datos:       CA
-- VersiÃ³n de Paquete:  v1.5.13
-- Compilado:           17/03/2026, 15:49:00
-- Sistema:             CA3 Control de Asistencia
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
--
-- LÃ³gica de esquema:
--   Para cada periodo de aniversario se selecciona el esquema de vacaciones
--   cuya FechaVigencia mÃ¡s reciente sea <= FechaInicioPeriodo.
--   Esto elimina strings hardcodeados y permite registrar futuras reformas
--   solo agregando filas en CatalogoReglasVacaciones con la nueva FechaVigencia.
--
-- Fixes respecto a v1.5.12:
--   [Bug1] @Fin se recalculaba DESPUÃ‰S de avanzar @Inicio â†’ periodos desfasados.
--   [Bug2] La condiciÃ³n '@Fin >= 2023-01-01' usaba la fecha fin (incorrecta);
--          ahora se usa @Inicio (fecha inicio del periodo) para elegir el esquema.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE OR ALTER PROCEDURE sp_Vacaciones_GenerarSaldosBase
    @AnioActual INT = NULL,  -- ParÃ¡metro de compatibilidad; se ignora, siempre genera todos los ciclos
    @EmpleadoId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- â”€â”€â”€ 1. ENTIDADES A PROCESAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    DECLARE @Emps TABLE (EmpleadoId INT, FechaIngreso DATE);
    INSERT INTO @Emps (EmpleadoId, FechaIngreso)
    SELECT EmpleadoId, FechaIngreso
    FROM Empleados
    WHERE Activo = 1
      AND FechaIngreso IS NOT NULL
      AND (@EmpleadoId IS NULL OR EmpleadoId = @EmpleadoId);

    -- â”€â”€â”€ 2. GENERACIÃ“N DE CICLOS (ANIVERSARIOS) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    DECLARE @Hoy   DATE = GETDATE();
    DECLARE @EmpId INT, @FIngreso DATE;

    DECLARE curEmp CURSOR FOR SELECT EmpleadoId, FechaIngreso FROM @Emps;
    OPEN curEmp;
    FETCH NEXT FROM curEmp INTO @EmpId, @FIngreso;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- [Cleanup Legacy] Eliminar registros de aÃ±os que usaban el aÃ±o natural (ej. 2022, 2023)
        -- para que el frontend solo vea los aniversarios 1, 2, 3...
        DELETE FROM VacacionesSaldos WHERE EmpleadoId = @EmpId AND Anio > 100;

        DECLARE @Aniv   INT  = 1;
        DECLARE @Inicio DATE = @FIngreso;
        DECLARE @Fin    DATE = DATEADD(DAY, -1, DATEADD(YEAR, 1, @FIngreso));

        -- Generar aniversarios hasta abarcar hoy + 1 perÃ­odo extra (para planeaciÃ³n)
        WHILE @Inicio <= DATEADD(YEAR, 1, @Hoy)
        BEGIN
            -- â”€â”€ SelecciÃ³n dinÃ¡mica de esquema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            -- Regla: tomar el esquema cuya FechaVigencia mÃ¡s reciente sea <= @Inicio.
            -- AsÃ­ se eliminan strings hardcodeados: cualquier reforma futura solo
            -- requiere insertar nuevas filas en CatalogoReglasVacaciones.
            DECLARE @FechaVigenciaEsquema DATE = (
                SELECT MAX(FechaVigencia)
                FROM CatalogoReglasVacaciones
                WHERE FechaVigencia <= @Inicio
            );

            -- DÃ­as otorgados para este aniversario en el esquema vigente
            DECLARE @DiasLey INT = (
                SELECT TOP 1 DiasOtorgados
                FROM CatalogoReglasVacaciones
                WHERE AniosAntiguedad    = @Aniv
                  AND FechaVigencia      = @FechaVigenciaEsquema
            );

            -- Fallback: si el catÃ¡logo no tiene entrada exacta para esta antigÃ¼edad,
            -- usar el mÃ¡ximo de dÃ­as del esquema vigente (empleados con antigÃ¼edad
            -- mayor al Ãºltimo aÃ±o registrado en el catÃ¡logo).
            IF @DiasLey IS NULL
            BEGIN
                SELECT @DiasLey = MAX(DiasOtorgados)
                FROM CatalogoReglasVacaciones
                WHERE FechaVigencia = @FechaVigenciaEsquema;
            END;

            -- Seguridad final: si el catÃ¡logo estÃ¡ vacÃ­o, no insertar basura
            IF @DiasLey IS NULL
                SET @DiasLey = 0;

            -- â”€â”€ Upsert del registro â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            IF NOT EXISTS (SELECT 1 FROM VacacionesSaldos WHERE EmpleadoId = @EmpId AND Anio = @Aniv)
            BEGIN
                INSERT INTO VacacionesSaldos
                    (EmpleadoId, Anio, FechaInicioPeriodo, FechaFinPeriodo,
                     DiasOtorgados, DiasDisfrutados, DiasPagados, DiasAjuste)
                VALUES
                    (@EmpId, @Aniv, @Inicio, @Fin, @DiasLey, 0, 0, 0);
            END
            ELSE
            BEGIN
                UPDATE VacacionesSaldos
                SET FechaInicioPeriodo = @Inicio,
                    FechaFinPeriodo    = @Fin,
                    DiasOtorgados      = @DiasLey
                WHERE EmpleadoId = @EmpId AND Anio = @Aniv;
            END

            -- â”€â”€ Avanzar al siguiente aniversario â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            -- [Fix Bug1] Se calcula @Fin ANTES de avanzar @Inicio para evitar
            -- que @Fin quede apuntando al aÃ±o equivocado.
            SET @Aniv   = @Aniv + 1;
            SET @Inicio = DATEADD(YEAR,  1, @Inicio);
            SET @Fin    = DATEADD(DAY,  -1, DATEADD(YEAR, 1, @Inicio));
            --                               â†‘ ahora @Inicio ya apunta al nuevo inicio,
            --                                 por lo que @Fin = nuevo inicio + 1 aÃ±o - 1 dÃ­a  âœ“
        END

        FETCH NEXT FROM curEmp INTO @EmpId, @FIngreso;
    END

    CLOSE curEmp;
    DEALLOCATE curEmp;

    -- â”€â”€â”€ 3. CONSOLIDACIÃ“N DE CONSUMO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    -- Resetear consumos dinÃ¡micos antes de recalcular
    UPDATE vs
    SET DiasDisfrutados = 0,
        DiasPagados     = 0
    FROM VacacionesSaldos vs
    JOIN @Emps e ON vs.EmpleadoId = e.EmpleadoId;

    -- A. PRENÃ“MINA (lo que ya se procesÃ³ en nÃ³mina)
    -- Cadena oficial para obtener el ConceptoId de vacaciones:
    --   SISTiposCalculo (TipoCalculoId='VACACIONES')
    --     â†’ CatalogoEstatusAsistencia.TipoCalculoId
    --     â†’ CatalogoEstatusAsistencia.ConceptoNominaId  â† esto es el ConceptoId en CatalogoConceptosNomina
    --     â†’ ese ConceptoNominaId coincide con PrenominaDetalle.ConceptoId
    DECLARE @ConceptoVacId INT = (
        SELECT TOP 1 cea.ConceptoNominaId
        FROM SISTiposCalculo stc
        JOIN CatalogoEstatusAsistencia cea ON cea.TipoCalculoId = stc.TipoCalculoId
        WHERE stc.TipoCalculoId = 'VACACIONES'
          AND cea.ConceptoNominaId IS NOT NULL
    );

    IF @ConceptoVacId IS NOT NULL
    BEGIN
        UPDATE vs
        SET vs.DiasDisfrutados = vs.DiasDisfrutados + ISNULL(pre.Total, 0)
        FROM VacacionesSaldos vs
        JOIN @Emps e ON vs.EmpleadoId = e.EmpleadoId -- [FIX] Only update target employees
        JOIN (
            SELECT pr.EmpleadoId, vs2.Anio, SUM(pd.Valor / 8.0) AS Total -- [FIX] Normalize Hours to Days
            FROM Prenomina pr
            JOIN PrenominaDetalle pd ON pr.Id = pd.CabeceraId
            JOIN VacacionesSaldos vs2
              ON pr.EmpleadoId = vs2.EmpleadoId
             AND pd.Fecha BETWEEN vs2.FechaInicioPeriodo AND vs2.FechaFinPeriodo
            WHERE pd.ConceptoId = @ConceptoVacId
            GROUP BY pr.EmpleadoId, vs2.Anio
        ) pre ON vs.EmpleadoId = pre.EmpleadoId AND vs.Anio = pre.Anio;
    END

    -- B. SOLICITUDES APROBADAS (solo las que NO estÃ¡n ya en prenÃ³mina)
    UPDATE vs
    SET vs.DiasDisfrutados = vs.DiasDisfrutados + ISNULL(sol.Total, 0)
    FROM VacacionesSaldos vs
    JOIN @Emps e ON vs.EmpleadoId = e.EmpleadoId -- [FIX] Only update target employees
    JOIN (
        SELECT sv.EmpleadoId, vs2.Anio, SUM(sv.DiasSolicitados) AS Total
        FROM SolicitudesVacaciones sv
        JOIN VacacionesSaldos vs2
          ON sv.EmpleadoId = vs2.EmpleadoId
         AND sv.FechaInicio BETWEEN vs2.FechaInicioPeriodo AND vs2.FechaFinPeriodo
        WHERE sv.Estatus = 'Aprobado'
          AND NOT EXISTS (
              SELECT 1
              FROM Prenomina p
              JOIN PrenominaDetalle d ON p.Id = d.CabeceraId
              WHERE p.EmpleadoId = sv.EmpleadoId
                AND d.ConceptoId = @ConceptoVacId
                AND d.Fecha      = sv.FechaInicio
          )
        GROUP BY sv.EmpleadoId, vs2.Anio
    ) sol ON vs.EmpleadoId = sol.EmpleadoId AND vs.Anio = sol.Anio;

    -- C. AJUSTES MANUALES (VacacionesSaldosDetalle)
    UPDATE vs
    SET vs.DiasDisfrutados = vs.DiasDisfrutados + ISNULL(adj.Total, 0)
    FROM VacacionesSaldos vs
    JOIN @Emps e ON vs.EmpleadoId = e.EmpleadoId -- [FIX] Only update target employees
    JOIN (
        SELECT SaldoId, SUM(Dias) AS Total
        FROM VacacionesSaldosDetalle
        GROUP BY SaldoId
    ) adj ON vs.SaldoId = adj.SaldoId;

END
GO