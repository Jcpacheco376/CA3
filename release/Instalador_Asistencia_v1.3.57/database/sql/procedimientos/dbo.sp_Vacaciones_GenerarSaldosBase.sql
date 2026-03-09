-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_GenerarSaldosBase]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Vacaciones_GenerarSaldosBase
                @AnioActual INT
            AS
            BEGIN
                SET NOCOUNT ON;

                -- Insert initial balance for all active employees for the year if not exists
                INSERT INTO VacacionesSaldos (EmpleadoId, Anio, DiasOtorgados, DiasDisfrutados)
                SELECT 
                    e.EmpleadoId, 
                    @AnioActual, 
                    -- Dynamic calculation of granted days based on seniority and Mexican Law
                    ISNULL((
                        SELECT TOP 1 crv.DiasOtorgados
                        FROM CatalogoReglasVacaciones crv
                        WHERE crv.Esquema = CASE WHEN @AnioActual >= 2023 THEN 'Ley-2023' ELSE 'Pre-2023' END
                          AND crv.AniosAntiguedad = CASE 
                                                      WHEN DATEDIFF(YEAR, e.FechaIngreso, DATEFROMPARTS(@AnioActual, 1, 1)) = 0 THEN 1 
                                                      ELSE DATEDIFF(YEAR, e.FechaIngreso, DATEFROMPARTS(@AnioActual, 1, 1)) 
                                                    END
                    ), 0),
                    0 -- Disfrutados (will be dynamically calculated by another process or API)
                FROM Empleados e
                WHERE e.Activo = 1 
                  AND NOT EXISTS (
                      SELECT 1 FROM VacacionesSaldos vs 
                      WHERE vs.EmpleadoId = e.EmpleadoId AND vs.Anio = @AnioActual
                  );

                -- Recalculate 'Disfrutados' and 'Restantes' dynamically based on Prenomina
                -- First find the ConceptoId for VAC
                DECLARE @ConceptoVacacionesId INT;
                SELECT TOP 1 @ConceptoVacacionesId = ccn.ConceptoId
                FROM CatalogoEstatusAsistencia cea
                JOIN CatalogoConceptosNomina ccn ON cea.ConceptoNominaId = ccn.ConceptoId
                WHERE cea.Abreviatura = 'VAC';

                -- Update Disfrutados crossing Prenomina
                IF @ConceptoVacacionesId IS NOT NULL
                BEGIN
                    UPDATE vs
                    SET vs.DiasDisfrutados = ISNULL(p.DiasTomados, 0)
                    FROM VacacionesSaldos vs
                    LEFT JOIN (
                        -- Suma de dias de vacaciones disfrutados en el año segun prenomina
                        SELECT 
                            pr.EmpleadoId, 
                            SUM(pd.Valor) as DiasTomados
                        FROM Prenomina pr
                        JOIN PrenominaDetalle pd ON pr.Id = pd.CabeceraId
                        WHERE pd.ConceptoId = @ConceptoVacacionesId
                          AND YEAR(pd.Fecha) = @AnioActual
                        GROUP BY pr.EmpleadoId
                    ) p ON vs.EmpleadoId = p.EmpleadoId
                    WHERE vs.Anio = @AnioActual;
                    
                    -- Adicionalmente sumar las Solicitudes Aprobadas que AUN no han pasado por prenomina
                    -- para no conceder más dias de los que se tiene en solicitudes futuras.
                    UPDATE vs
                    SET vs.DiasDisfrutados = vs.DiasDisfrutados + ISNULL(sol.DiasFuturos, 0)
                    FROM VacacionesSaldos vs
                    LEFT JOIN (
                        SELECT 
                            EmpleadoId,
                            SUM(DiasSolicitados) as DiasFuturos
                        FROM SolicitudesVacaciones
                        WHERE Estatus = 'Aprobado' 
                          AND YEAR(FechaInicio) = @AnioActual
                          -- Solo las que no esten en un periodo cerrado de prenomina (Simplificacion: sumar todas y restar prenomina si es necesario,
                          -- En este caso asumiremos que Prenomina es la historica real.
                          -- Idealmente deberia existir una bandera en SolicitudesVacaciones "AplicadoEnNomina". 
                          -- Añadiremos esto mas adelante si es necesario, por ahora tomaremos solo Solicitudes = Aprobado futuras a hoy.
                          AND FechaInicio > GETDATE()
                        GROUP BY EmpleadoId
                    ) sol ON vs.EmpleadoId = sol.EmpleadoId
                    WHERE vs.Anio = @AnioActual;
                END
                ELSE
                BEGIN
                    -- Si no hay concepto ligado a prenomina, hacer fallback a SolicitudesVacaciones historicas
                    UPDATE vs
                    SET vs.DiasDisfrutados = ISNULL(sol.DiasTomados, 0)
                    FROM VacacionesSaldos vs
                    LEFT JOIN (
                        SELECT EmpleadoId, SUM(DiasSolicitados) as DiasTomados
                        FROM SolicitudesVacaciones
                        WHERE Estatus = 'Aprobado' AND YEAR(FechaInicio) = @AnioActual
                        GROUP BY EmpleadoId
                    ) sol ON vs.EmpleadoId = sol.EmpleadoId
                    WHERE vs.Anio = @AnioActual;
                END
            END
GO