-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_Votar]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Incidencias_Votar]
    @IncidenciaId INT,
    @AutorizacionId INT,
    @Veredicto NVARCHAR(20), 
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT,
    @EsAdmin BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @RolRequeridoId INT, @EstatusActual NVARCHAR(20);
    SELECT @RolRequeridoId = RolRequeridoId, @EstatusActual = Estatus 
    FROM dbo.IncidenciasAutorizaciones WHERE AutorizacionId = @AutorizacionId;

    IF @EstatusActual IS NULL 
    BEGIN
        -- Intento de recuperaci�n: buscar por Incidencia y Rol si el ID de autorizaci�n vino mal
        SELECT TOP 1 @AutorizacionId = AutorizacionId, @EstatusActual = Estatus
        FROM dbo.IncidenciasAutorizaciones 
        WHERE IncidenciaId = @IncidenciaId AND Estatus = 'Pendiente';
    END

    IF @EstatusActual <> 'Pendiente' 
    BEGIN
        RAISERROR('Esta solicitud ya fue procesada o no es v�lida.', 16, 1);
        RETURN;
    END

    -- Validar SISPermisos (Seguridad)
    IF @EsAdmin = 0 AND NOT EXISTS (SELECT 1 FROM dbo.UsuariosRoles WHERE UsuarioId = @UsuarioAccionId AND RoleId = @RolRequeridoId)
    BEGIN
        RAISERROR('No tienes el rol necesario para firmar esta autorizaci�n.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Registrar el Voto
        UPDATE dbo.IncidenciasAutorizaciones 
        SET Estatus = @Veredicto, UsuarioAutorizoId = @UsuarioAccionId, FechaRespuesta = GETDATE()
        WHERE AutorizacionId = @AutorizacionId;

        -- CASO A: RECHAZADO (Se cae todo el proceso)
        IF @Veredicto = 'Rechazado'
        BEGIN
            UPDATE dbo.Incidencias 
            SET Estado = 'Asignada', -- Regresa a Asignada para que la corrijan o cambien
                RequiereAutorizacion = 0 
            WHERE IncidenciaId = @IncidenciaId;
            
            INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
            VALUES (@IncidenciaId, @UsuarioAccionId, 'RechazarSolicitud', ISNULL(@Comentario, 'Solicitud rechazada.'), 'Asignada', GETDATE());
        END
        
        -- CASO B: APROBADO (Verificar si faltan firmas)
        ELSE
        BEGIN

            IF NOT EXISTS (SELECT 1 FROM dbo.IncidenciasAutorizaciones WHERE IncidenciaId = @IncidenciaId AND Estatus = 'Pendiente')
            BEGIN
                -- �TODOS APROBARON! -> CONCEDER PERMISO
                
                DECLARE @Emp INT, @Fec DATE, @NombreAutorizador NVARCHAR(100);
                SELECT @Emp = EmpleadoId, @Fec = Fecha FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId;
                SELECT @NombreAutorizador = NombreCompleto FROM dbo.Usuarios WHERE UsuarioId = @UsuarioAccionId;

                -- 1. Liberar Ficha (Quitar el flag de incidencia para que pase a N�mina)
                UPDATE dbo.FichaAsistencia 
                SET IncidenciaActivaId = NULL,
                    Comentarios = ISNULL(Comentarios, '') + ' [Autorizado por: ' + @NombreAutorizador + ']'
                WHERE EmpleadoId = @Emp AND Fecha = @Fec;

                -- 2. Cerrar Incidencia
                UPDATE dbo.Incidencias 
                SET Estado = 'Resuelta', 
                    FechaCierre = GETDATE(), 
                    ResueltoPorUsuarioId = @UsuarioAccionId 
                WHERE IncidenciaId = @IncidenciaId;

                -- 3. Bit�cora Final
                INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
                VALUES (@IncidenciaId, @UsuarioAccionId, 'AutorizacionTotal', 'Excepcion autorizada y aplicada. ' + ISNULL(@Comentario,''), 'Resuelta', GETDATE());
            END
            ELSE
            BEGIN
                -- A�n faltan firmas de otros roles
                INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
                VALUES (@IncidenciaId, @UsuarioAccionId, 'VotoPositivo', 'Voto aprobado. Esperando mas firmas...', 'PorAutorizar', GETDATE());
            END
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO