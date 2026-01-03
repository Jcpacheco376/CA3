IF OBJECT_ID('dbo.sp_Incidencias_CancelarSolicitud') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_CancelarSolicitud;
GO

CREATE PROCEDURE [dbo].[sp_Incidencias_CancelarSolicitud]
    @IncidenciaId INT,
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT,
    @EsAdmin BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @AsignadoA INT;
    SELECT @AsignadoA = AsignadoAUsuarioId FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId;

    IF @EsAdmin = 0 AND @AsignadoA <> @UsuarioAccionId
    BEGIN
        RAISERROR('No tienes permiso para cancelar esta solicitud.', 16, 1);
        RETURN;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        DELETE FROM dbo.IncidenciasAutorizaciones WHERE IncidenciaId = @IncidenciaId;

        UPDATE dbo.Incidencias 
        SET Estado = 'Asignada', RequiereAutorizacion = 0 
        WHERE IncidenciaId = @IncidenciaId;

        INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
        VALUES (@IncidenciaId, @UsuarioAccionId, 'CancelarSolicitud', ISNULL(@Comentario, 'Cancelación de solicitud.'), 'Asignada', GETDATE());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END

