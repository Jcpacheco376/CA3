-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_ResponderSolicitud]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Vacaciones_ResponderSolicitud
                @SolicitudId INT,
                @Estatus VARCHAR(20), -- 'Aprobado' o 'Rechazado'
                @UsuarioAutorizoId INT,
                @RolAprobador VARCHAR(50) = NULL -- e.g., 'JefeDirecto', 'RecursosHumanos', 'Gerencia'
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @EmpleadoId INT;
                DECLARE @FechaInicio DATE;
                DECLARE @FechaFin DATE;
                DECLARE @DiasSolicitados INT;
                DECLARE @EstatusActual VARCHAR(20);
                DECLARE @AnioActual INT;
                DECLARE @EstatusVacId INT;
                DECLARE @AprobacionesRestantes INT;

                -- 1. Validar estado general de la solicitud
                SELECT
                    @EmpleadoId = EmpleadoId,
                    @FechaInicio = FechaInicio,
                    @FechaFin = FechaFin,
                    @DiasSolicitados = DiasSolicitados,
                    @EstatusActual = Estatus
                FROM SolicitudesVacaciones
                WHERE SolicitudId = @SolicitudId;

                IF @EstatusActual <> 'Pendiente'
                BEGIN
                    RAISERROR('La solicitud ya ha sido respondida o finalizada.', 16, 1);
                    RETURN;
                END

                -- 2. Actualizar la firma especifica si se envio un Rol
                IF @RolAprobador IS NOT NULL
                BEGIN
                    -- Actualizamos la firma de este rol
                    UPDATE SolicitudesVacacionesFirmas
                    SET EstatusFirma = @Estatus,
                        UsuarioFirmaId = @UsuarioAutorizoId,
                        FechaFirma = GETDATE()
                    FROM SolicitudesVacacionesFirmas f
                    JOIN VacacionesAprobadoresConfig c ON f.ConfigId = c.ConfigId
                    WHERE f.SolicitudId = @SolicitudId AND c.RolAprobador = @RolAprobador;
                END
                ELSE
                BEGIN
                    -- Si no hay rol (Admin general forzando, etc), marcamos todas como Aprobado si es Aprobado
                    -- O podemos simplemente no hacer update a firmas. Para mantener consistencia, evitamos forzados sin rol a menos que sea necesario.
                    -- Por ahora ignoramos firmas especificas.
                    PRINT 'Advertencia: No se especificó RolAprobador';
                END

                -- 3. Logica de resolucion total
                IF @Estatus = 'Rechazado'
                BEGIN
                    -- Si cualquier rol la rechaza, se rechaza todo
                    UPDATE SolicitudesVacaciones
                    SET
                        Estatus = 'Rechazado',
                        UsuarioAutorizoId = @UsuarioAutorizoId,
                        FechaRespuesta = GETDATE()
                    WHERE SolicitudId = @SolicitudId;
                    
                    RETURN;
                END

                IF @Estatus = 'Aprobado'
                BEGIN
                    -- Revisar si faltan firmas obligatorias
                    SELECT @AprobacionesRestantes = COUNT(*)
                    FROM SolicitudesVacacionesFirmas f
                    JOIN VacacionesAprobadoresConfig c ON f.ConfigId = c.ConfigId
                    WHERE f.SolicitudId = @SolicitudId
                      AND c.EsObligatorio = 1
                      AND (f.EstatusFirma IS NULL OR f.EstatusFirma = 'Pendiente');

                    -- Si no faltan aprobaciones pendientes, aprobar general y aplicar Asistencias
                    IF @AprobacionesRestantes = 0
                    BEGIN
                        -- 4. Actualizar Solicitud Principal
                        UPDATE SolicitudesVacaciones
                        SET
                            Estatus = 'Aprobado',
                            UsuarioAutorizoId = @UsuarioAutorizoId,
                            FechaRespuesta = GETDATE()
                        WHERE SolicitudId = @SolicitudId;

                        -- Recalcular base para registrar (ya no sumamos dias disfrutados manualmente a VacacionesSaldos
                        -- porque el nuevo procedimiento GenerarSaldosBase lo leera dinamicamente de Prenomina o Solicitudes)

                        -- 5. Insertar / Actualizar Fichas de Asistencia (Iterar fechas)
                        DECLARE @CurrentDate DATE = @FechaInicio;
                        SELECT TOP 1 @EstatusVacId = EstatusId FROM CatalogoEstatusAsistencia WHERE Abreviatura = 'VAC';

                        WHILE @CurrentDate <= @FechaFin
                        BEGIN
                            -- Aquí ignoraremos días de descanso (idealmente se calcula basándose en el horario del empleado)
                            -- Pero como simplificación, insertamos / actualizamos la ficha directamente indicando la vacación.
                            IF EXISTS (SELECT 1 FROM FichaAsistencia WHERE EmpleadoId = @EmpleadoId AND Fecha = @CurrentDate)
                            BEGIN
                                UPDATE FichaAsistencia
                                SET EstatusManualId = @EstatusVacId,
                                    Estado = 'VALIDADO',
                                    Comentarios = ISNULL(Comentarios, '') + ' (Vacaciones Aprobadas)',
                                    FechaModificacion = GETDATE(),
                                    ModificadoPorUsuarioId = @UsuarioAutorizoId
                                WHERE EmpleadoId = @EmpleadoId AND Fecha = @CurrentDate;
                            END
                            ELSE
                            BEGIN
                                -- Insertamos basico si no existe ficha ese dia:
                                DECLARE @HorarioId INT;
                                SELECT @HorarioId = HorarioIdPredeterminado FROM Empleados WHERE EmpleadoId = @EmpleadoId;

                                INSERT INTO FichaAsistencia (EmpleadoId, Fecha, HorarioId, EstatusManualId, Estado, ModificadoPorUsuarioId, FechaModificacion, Comentarios)
                                VALUES (@EmpleadoId, @CurrentDate, @HorarioId, @EstatusVacId, 'VALIDADO', @UsuarioAutorizoId, GETDATE(), 'Vacaciones Aprobadas');
                            END

                            SET @CurrentDate = DATEADD(day, 1, @CurrentDate);
                        END
                    END
                END
            END
GO