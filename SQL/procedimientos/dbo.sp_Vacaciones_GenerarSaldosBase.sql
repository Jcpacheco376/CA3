-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_GenerarSaldosBase]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Vacaciones_GenerarSaldosBase
                @AnioActual INT,
                @EmpleadoId INT = NULL
            AS
            BEGIN
                SET NOCOUNT ON;

                -- 1. Asegurar registro de saldo base
                -- Calculamos el año natural real para evaluar reglas (independientemente si @AnioActual es el año 2024 o el índice 3)
                INSERT INTO VacacionesSaldos (EmpleadoId, Anio, DiasOtorgados, DiasDisfrutados)
                SELECT 
                    e.EmpleadoId, 
                    @AnioActual, 
                    ISNULL((
                        SELECT TOP 1 crv.DiasOtorgados
                        FROM CatalogoReglasVacaciones crv
                        WHERE crv.Esquema = CASE 
                            WHEN (@AnioActual >= 2023 OR (@AnioActual < 1000 AND YEAR(DATEADD(YEAR, @AnioActual - 1, e.FechaIngreso)) >= 2023)) 
                            THEN 'Ley-2023' 
                            ELSE 'Pre-2023' 
                        END
                        AND crv.AniosAntiguedad = CASE 
                            WHEN @AnioActual >= 1000 THEN 
                                CASE WHEN DATEDIFF(YEAR, e.FechaIngreso, DATEFROMPARTS(@AnioActual, 1, 1)) <= 0 THEN 1 
                                ELSE DATEDIFF(YEAR, e.FechaIngreso, DATEFROMPARTS(@AnioActual, 1, 1)) END
                            ELSE @AnioActual -- Si @AnioActual es un índice (1, 2, 3), coincide con AniosAntiguedad
                        END
                    ), 12),
                    0
                FROM Empleados e
                WHERE e.Activo = 1 
                  AND (@EmpleadoId IS NULL OR e.EmpleadoId = @EmpleadoId)
                  AND NOT EXISTS (
                      SELECT 1 FROM VacacionesSaldos vs 
                      WHERE vs.EmpleadoId = e.EmpleadoId AND vs.Anio = @AnioActual
                  );

                -- 2. Recalcular 'DiasDisfrutados' (Consumo Total)
                DECLARE @ConceptoVacacionesId INT;
                SELECT TOP 1 @ConceptoVacacionesId = cea.ConceptoNominaId
                FROM CatalogoEstatusAsistencia cea
                WHERE cea.Abreviatura = 'VAC';

                IF @ConceptoVacacionesId IS NOT NULL
                BEGIN
                    UPDATE vs
                    SET vs.DiasDisfrutados = 
                        -- a) Prenómina
                        ISNULL((
                            SELECT SUM(pd.Valor)
                            FROM Prenomina pr
                            JOIN PrenominaDetalle pd ON pr.Id = pd.CabeceraId
                            WHERE pr.EmpleadoId = vs.EmpleadoId
                              AND pd.ConceptoId = @ConceptoVacacionesId
                              AND (
                                  (vs.FechaInicioPeriodo IS NOT NULL AND pd.Fecha BETWEEN vs.FechaInicioPeriodo AND vs.FechaFinPeriodo)
                                  OR 
                                  (vs.FechaInicioPeriodo IS NULL AND (vs.Anio >= 1000 AND YEAR(pd.Fecha) = vs.Anio OR vs.Anio < 1000 AND YEAR(pd.Fecha) = YEAR(DATEADD(YEAR, vs.Anio-1, e2.FechaIngreso))))
                              )
                        ), 0)
                        +
                        -- b) Solicitudes
                        ISNULL((
                            SELECT SUM(DiasSolicitados)
                            FROM SolicitudesVacaciones
                            WHERE EmpleadoId = vs.EmpleadoId
                              AND Estatus = 'Aprobado' AND FechaInicio > GETDATE()
                              AND (
                                  (vs.FechaInicioPeriodo IS NOT NULL AND FechaInicio BETWEEN vs.FechaInicioPeriodo AND vs.FechaFinPeriodo)
                                  OR (vs.FechaInicioPeriodo IS NULL AND (vs.Anio >= 1000 AND YEAR(FechaInicio) = vs.Anio OR vs.Anio < 1000 AND YEAR(FechaInicio) = YEAR(DATEADD(YEAR, vs.Anio-1, e2.FechaIngreso))))
                              )
                        ), 0)
                        +
                        -- c) Ajustes
                        ISNULL((
                            SELECT SUM(Dias)
                            FROM VacacionesSaldosDetalle
                            WHERE SaldoId = vs.SaldoId 
                              AND Tipo IN ('Ajuste', 'Pagado')
                        ), 0)
                    FROM VacacionesSaldos vs
                    JOIN Empleados e2 ON vs.EmpleadoId = e2.EmpleadoId
                    WHERE vs.Anio = @AnioActual
                      AND (@EmpleadoId IS NULL OR vs.EmpleadoId = @EmpleadoId);
                END
            END
GO