IF OBJECT_ID('dbo.sp_Incidencias_Asignar') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_Asignar;
GO

CREATE PROCEDURE [dbo].[sp_Incidencias_Asignar]
    @IncidenciaId INT,
    @UsuarioAsignadoId INT,
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT -- El usuario que está ejecutando la acción
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Actualizar la Incidencia
        UPDATE dbo.Incidencias
        SET 
            AsignadoAUsuarioId = @UsuarioAsignadoId,
            Estado = 'Asignada'
        WHERE IncidenciaId = @IncidenciaId;

        -- 2. Registrar en Bitácora
        INSERT INTO dbo.IncidenciasBitacora (
            IncidenciaId, 
            UsuarioId, 
            Accion, 
            Comentario, 
            AsignadoA_Nuevo, 
            EstadoNuevo,
            FechaMovimiento
        )
        VALUES (
            @IncidenciaId, 
            @UsuarioAccionId, 
            'Asignar', 
            @Comentario, 
            @UsuarioAsignadoId, 
            'Asignada',
            GETDATE()
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR (@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END

