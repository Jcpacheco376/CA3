-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_CancelarSolicitud]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Incidencias_CancelarSolicitud]
    @IncidenciaId INT,
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT,
    @EsAdmin BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @AsignadoA INT;
    DECLARE @EstadoAnterior VARCHAR(20);
    DECLARE @EstatusManualId INT;
    DECLARE @EstatusChecadorId INT;
    DECLARE @ApelacionIdActual INT;

    SELECT 
        @AsignadoA = I.AsignadoAUsuarioId,
        @EstadoAnterior = I.Estado,
        @EstatusManualId = I.EstatusManualId,
        @EstatusChecadorId = I.EstatusChecadorId,
        @ApelacionIdActual = (SELECT TOP 1 ApelacionId FROM dbo.IncidenciasAutorizaciones WHERE IncidenciaId = @IncidenciaId AND Activo = 1)
    FROM dbo.Incidencias I
    WHERE I.IncidenciaId = @IncidenciaId;

    IF @EsAdmin = 0 AND @AsignadoA <> @UsuarioAccionId
    BEGIN
        THROW 51000, 'No tienes permiso para cancelar esta solicitud.', 1;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. SOFT DELETE con contexto
        UPDATE dbo.IncidenciasAutorizaciones 
        SET Activo = 0 
        WHERE IncidenciaId = @IncidenciaId AND Activo = 1;

        -- 2. Restaurar Estado
        UPDATE dbo.Incidencias 
        SET Estado = 'Asignada', 
            RequiereAutorizacion = 0 
        WHERE IncidenciaId = @IncidenciaId;

        -- 3. Bit�cora (Cierre del Ciclo)
        INSERT INTO dbo.IncidenciasBitacora (
            IncidenciaId, UsuarioId, Accion, Comentario, 
            EstadoNuevo, EstadoAnterior,
            EstatusManualId_Anterior, EstatusManualId_Nuevo,
            EstatusChecadorId_Anterior, EstatusChecadorId_Nuevo,
            ApelacionId, 
            FechaMovimiento
        )
        VALUES (
            @IncidenciaId, 
            @UsuarioAccionId, 
            'CancelarSolicitud', 
            ISNULL(@Comentario, 'Cancelaci�n de solicitud por el usuario.'), 
            'Asignada', 
            @EstadoAnterior,
            @EstatusManualId, @EstatusManualId,
            @EstatusChecadorId, @EstatusChecadorId,
            @ApelacionIdActual,
            GETDATE()
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 51000, @Msg, 1;
    END CATCH
END
GO