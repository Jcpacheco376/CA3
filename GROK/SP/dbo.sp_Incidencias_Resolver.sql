IF OBJECT_ID('dbo.sp_Incidencias_Resolver') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_Resolver;
GO

CREATE PROCEDURE [dbo].[sp_Incidencias_Resolver]
    @IncidenciaId INT,
    @NuevoEstatusAbrev NVARCHAR(10),
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @EmpleadoId INT, @Fecha DATE;
        SELECT @EmpleadoId = EmpleadoId, @Fecha = Fecha FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId;

        DECLARE @NuevoEstatusId INT;
        SELECT @NuevoEstatusId = EstatusId FROM dbo.CatalogoEstatusAsistencia WHERE Abreviatura = @NuevoEstatusAbrev;
        
        IF @NuevoEstatusId IS NULL RAISERROR('Estatus inválido.', 16, 1);

        -- Actualizar Ficha
        UPDATE dbo.FichaAsistencia 
        SET EstatusManualId = @NuevoEstatusId, 
            IncidenciaActivaId = NULL 
        WHERE EmpleadoId = @EmpleadoId AND Fecha = @Fecha;

        -- Cerrar Incidencia
        UPDATE dbo.Incidencias 
        SET Estado = 'Resuelta', 
            FechaCierre = GETDATE(), 
            ResueltoPorUsuarioId = @UsuarioAccionId 
        WHERE IncidenciaId = @IncidenciaId;

        -- Bitácora
        INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, Accion, Comentario, EstadoNuevo, FechaMovimiento)
        VALUES (@IncidenciaId, @UsuarioAccionId, 'Resolver', @Comentario, 'Resuelta', GETDATE());

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END

