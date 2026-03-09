-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Vacaciones_CrearSolicitud]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE sp_Vacaciones_CrearSolicitud
                @EmpleadoId INT,
                @FechaInicio DATE,
                @FechaFin DATE,
                @DiasSolicitados INT,
                @Comentarios NVARCHAR(MAX),
                @UsuarioSolicitanteId INT,
                @SolicitanteRolName VARCHAR(50) = 'Empleado' -- 'Empleado', 'JefeDirecto', 'RecursosHumanos', 'Gerencia'
            AS
            BEGIN
                SET NOCOUNT ON;

                DECLARE @AnioActual INT = YEAR(GETDATE());
                DECLARE @DiasRestantes INT;

                -- Forcing recalculation of base balance if it hasn't been generated yet
                IF NOT EXISTS (SELECT 1 FROM VacacionesSaldos WHERE EmpleadoId = @EmpleadoId AND Anio = @AnioActual)
                BEGIN
                    EXEC sp_Vacaciones_GenerarSaldosBase @AnioActual;
                END

                -- Verificar saldo
                -- Since DiasRestantes is a computed column or derived visually now, we need to read DiasOtorgados - DiasDisfrutados
                SELECT @DiasRestantes = (DiasOtorgados - DiasDisfrutados)
                FROM VacacionesSaldos
                WHERE EmpleadoId = @EmpleadoId AND Anio = @AnioActual;

                IF @DiasRestantes IS NULL OR @DiasRestantes < @DiasSolicitados
                BEGIN
                    RAISERROR('El empleado no tiene suficientes días de vacaciones.', 16, 1);
                    RETURN;
                END

                -- Insertar solicitud principal
                DECLARE @NuevoSolicitudId INT;

                INSERT INTO SolicitudesVacaciones (
                    EmpleadoId, FechaInicio, FechaFin, DiasSolicitados, 
                    Comentarios, Estatus, FechaSolicitud, UsuarioSolicitanteId
                )
                VALUES (
                    @EmpleadoId, @FechaInicio, @FechaFin, @DiasSolicitados, 
                    @Comentarios, 'Pendiente', GETDATE(), @UsuarioSolicitanteId
                );

                SET @NuevoSolicitudId = SCOPE_IDENTITY();

                -- Insertar firmas pendientes basadas en la configuración
                INSERT INTO SolicitudesVacacionesFirmas (
                    SolicitudId, ConfigId, EstatusFirma, UsuarioFirmaId, FechaFirma
                )
                SELECT 
                    @NuevoSolicitudId,
                    ConfigId,
                    -- Logica de Autofirma
                    CASE WHEN RolAprobador = @SolicitanteRolName THEN 'Aprobado' ELSE 'Pendiente' END,
                    CASE WHEN RolAprobador = @SolicitanteRolName THEN @UsuarioSolicitanteId ELSE NULL END,
                    CASE WHEN RolAprobador = @SolicitanteRolName THEN GETDATE() ELSE NULL END
                FROM VacacionesAprobadoresConfig
                WHERE EsObligatorio = 1;

                -- Verificar si de causalidad todas las firmas ya se autoaprobaron (e.g. un Gerente/RH que tiene un rol supremo y se quitan firmas o algo asi)
                -- Esto se resolvera en sp_Vacaciones_ResponderSolicitud en el futuro, pero lo checamos por si acaso
                DECLARE @TotalFirmas INT;
                DECLARE @FirmasAprobadas INT;

                SELECT @TotalFirmas = COUNT(*) FROM SolicitudesVacacionesFirmas WHERE SolicitudId = @NuevoSolicitudId;
                SELECT @FirmasAprobadas = COUNT(*) FROM SolicitudesVacacionesFirmas WHERE SolicitudId = @NuevoSolicitudId AND EstatusFirma = 'Aprobado';

                IF @TotalFirmas = @FirmasAprobadas AND @TotalFirmas > 0
                BEGIN
                    UPDATE SolicitudesVacaciones SET Estatus = 'Aprobado' WHERE SolicitudId = @NuevoSolicitudId;
                    
                    -- Aqui deberiamos insertar en asistencia, pero lo podemos delegar o reusar la logica de ResponderSolicitud
                END

                SELECT @NuevoSolicitudId as SolicitudId;
            END
GO