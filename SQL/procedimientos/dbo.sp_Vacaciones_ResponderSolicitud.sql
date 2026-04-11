-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_ResponderSolicitud]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE sp_Vacaciones_ResponderSolicitud
                @SolicitudId INT,
                @Estatus VARCHAR(20), -- 'Aprobado' o 'Rechazado'
                @UsuarioAutorizoId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                DECLARE @EmpleadoId INT;
                DECLARE @UsuarioSolicitanteId INT;
                DECLARE @FechaInicio DATE;
                DECLARE @FechaFin DATE;
                DECLARE @DiasSolicitados INT;
                DECLARE @EstatusActual VARCHAR(20);
                DECLARE @EstatusVacId INT;
                DECLARE @AprobacionesRestantes INT;
                DECLARE @FirmasActualizadas INT = 0;
                -- 1. Validar estado general de la solicitud
                SELECT
                    @EmpleadoId = EmpleadoId,
                    @UsuarioSolicitanteId = UsuarioSolicitanteId,
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
                -- 2. Manejo de 'Cancelado': Solo el creador de la solicitud puede cancelarla
                IF @Estatus = 'Cancelado'
                BEGIN
                    IF @UsuarioSolicitanteId <> @UsuarioAutorizoId
                    BEGIN
                        RAISERROR('Solo el usuario que generó la solicitud puede cancelarla.', 16, 1);
                        RETURN;
                    END
                    UPDATE SolicitudesVacaciones
                    SET
                        Estatus = 'Cancelado',
                        UsuarioAutorizoId = @UsuarioAutorizoId,
                        FechaRespuesta = GETDATE()
                    WHERE SolicitudId = @SolicitudId;
                    UPDATE SolicitudesVacacionesFirmas
                    SET EstatusFirma = 'Cancelado', UsuarioFirmaId = @UsuarioAutorizoId, FechaFirma = GETDATE()
                    WHERE SolicitudId = @SolicitudId AND (EstatusFirma IS NULL OR EstatusFirma = 'Pendiente');
                    RETURN;
                END
                -- 3. Seguridad para Aprobación/Rechazo: Validar si el usuario puede gestionar al empleado
                -- Exceptuamos si es Administrador (RoleId = 1)
                IF NOT EXISTS (SELECT 1 FROM UsuariosRoles WHERE UsuarioId = @UsuarioAutorizoId AND RoleId = 1)
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioAutorizoId) WHERE EmpleadoId = @EmpleadoId)
                    BEGIN
                        RAISERROR('No tienes permiso para gestionar a este empleado según tus filtros de seguridad.', 16, 1);
                        RETURN;
                    END
                END
                
                -- 4. Si @Estatus = 'Rechazado', se rechaza la solicitud completa de inmediato
                IF @Estatus = 'Rechazado'
                BEGIN
                    UPDATE SolicitudesVacaciones
                    SET
                        Estatus = 'Rechazado',
                        UsuarioAutorizoId = @UsuarioAutorizoId,
                        FechaRespuesta = GETDATE()
                    WHERE SolicitudId = @SolicitudId;
                    
                    -- Opcional: Rechazar también las firmas pendientes
                    UPDATE SolicitudesVacacionesFirmas
                    SET EstatusFirma = 'Rechazado', UsuarioFirmaId = @UsuarioAutorizoId, FechaFirma = GETDATE()
                    WHERE SolicitudId = @SolicitudId AND (EstatusFirma IS NULL OR EstatusFirma = 'Pendiente');
                    
                    RETURN;
                END
                -- 4. Si @Estatus = 'Aprobado', identificamos qué firmas puede aprobar este usuario
                IF @Estatus = 'Aprobado'
                BEGIN
                    -- Actualizamos la firma correspondiente a los roles del usuario
                    UPDATE f
                    SET f.EstatusFirma = 'Aprobado',
                        f.UsuarioFirmaId = @UsuarioAutorizoId,
                        f.FechaFirma = GETDATE()
                    FROM SolicitudesVacacionesFirmas f
                    JOIN VacacionesAprobadoresConfig c ON f.ConfigId = c.ConfigId
                    JOIN UsuariosRoles ur ON c.RoleId = ur.RoleId
                    WHERE f.SolicitudId = @SolicitudId 
                        AND ur.UsuarioId = @UsuarioAutorizoId
                        AND (f.EstatusFirma IS NULL OR f.EstatusFirma = 'Pendiente');
                    SET @FirmasActualizadas = @@ROWCOUNT;
                    IF @FirmasActualizadas = 0
                    BEGIN
                        RAISERROR('No cuentas con los roles necesarios para autorizar esta etapa de la solicitud.', 16, 1);
                        RETURN;
                    END
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
                        -- Actualizar Solicitud Principal
                        UPDATE SolicitudesVacaciones
                        SET
                            Estatus = 'Aprobado',
                            UsuarioAutorizoId = @UsuarioAutorizoId,
                            FechaRespuesta = GETDATE()
                        WHERE SolicitudId = @SolicitudId;
                        -- Insertar / Actualizar Fichas de Asistencia
                        DECLARE @CurrentDate DATE = @FechaInicio;
                        SELECT TOP 1 @EstatusVacId = EstatusId FROM CatalogoEstatusAsistencia WHERE Abreviatura = 'VAC';
                        WHILE @CurrentDate <= @FechaFin
                        BEGIN
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