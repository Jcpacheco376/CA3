IF OBJECT_ID('dbo.sp_Incidencias_Votar') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_Votar;
GO

CREATE PROCEDURE [dbo].[sp_Incidencias_Votar]
    @IncidenciaId INT,
    @AutorizacionId INT,
    @Veredicto NVARCHAR(20), -- 'Aprobado' | 'Rechazado'
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT,
    @EsAdmin BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @RolRequeridoId INT, @EstatusActual NVARCHAR(20);
    SELECT @RolRequeridoId = RolRequeridoId, @EstatusActual = Estatus 
    FROM dbo.IncidenciasAutorizaciones WHERE AutorizacionId = @AutorizacionId;

    IF @EstatusActual IS NULL RAISERROR('Autorización no encontrada.', 16, 1);
    IF @EstatusActual <> 'Pendiente' RAISERROR('Esta solicitud ya fue procesada.', 16, 1);

    -- Validar Permisos
    IF @EsAdmin = 0 AND NOT EXISTS (SELECT 1 FROM dbo.UsuariosRoles WHERE UsuarioId = @UsuarioAccionId AND RoleId = @RolRequeridoId)
    BEGIN
        RAISERROR('No tienes el rol necesario para autorizar esto.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Registrar Voto
        UPDATE dbo.IncidenciasAutorizaciones 
        SET Estatus = @Veredicto, UsuarioAutorizoId = @UsuarioAccionId, FechaRespuesta = GETDATE()
        WHERE AutorizacionId = @AutorizacionId;

        IF @Veredicto = 'Rechazado'
        BEGIN
            -- Rechazo total
            UPDATE dbo.Incidencias SET Estado = 'Asignada', RequiereAutorizacion = 0 WHERE IncidenciaId = @IncidenciaId;
            
            INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
            VALUES (@IncidenciaId, @UsuarioAccionId, 'RechazarSolicitud', ISNULL(@Comentario, 'Solicitud rechazada.'), 'Asignada', GETDATE());
        END
        ELSE
        BEGIN
            -- Aprobado: Revisar si faltan más
            IF NOT EXISTS (SELECT 1 FROM dbo.IncidenciasAutorizaciones WHERE IncidenciaId = @IncidenciaId AND Estatus = 'Pendiente')
            BEGIN
                -- Todos aprobaron -> Resolución automática
                DECLARE @Emp INT, @Fec DATE;
                SELECT @Emp = EmpleadoId, @Fec = Fecha FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId;

                -- Liberar Ficha (Se mantiene el estatus manual actual)
                UPDATE dbo.FichaAsistencia SET IncidenciaActivaId = NULL WHERE EmpleadoId = @Emp AND Fecha = @Fec;

                -- Cerrar Incidencia
                UPDATE dbo.Incidencias SET Estado = 'Resuelta', FechaCierre = GETDATE(), ResueltoPorUsuarioId = @UsuarioAccionId WHERE IncidenciaId = @IncidenciaId;

                INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
                VALUES (@IncidenciaId, @UsuarioAccionId, 'AutorizacionTotal', ISNULL(@Comentario, 'Autorización completada.'), 'Resuelta', GETDATE());
            END
            ELSE
            BEGIN
                -- Voto parcial
                INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
                VALUES (@IncidenciaId, @UsuarioAccionId, 'VotoPositivo', ISNULL(@Comentario, 'Voto aprobado.'), 'PorAutorizar', GETDATE());
            END
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END

