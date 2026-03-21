-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_Resolver]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Incidencias_Resolver]
    @IncidenciaId INT,
    @NuevoEstatusAbrev NVARCHAR(10),
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. OBTENER CONTEXTO Y FOTO ACTUAL
        DECLARE @EmpleadoId INT, @Fecha DATE;
        DECLARE @EstadoActual VARCHAR(20);
        DECLARE @EstatusManualIdActual INT;
        DECLARE @EstatusChecadorIdActual INT;
        
        SELECT 
            @EmpleadoId = EmpleadoId, 
            @Fecha = Fecha,
            @EstadoActual = Estado,
            @EstatusManualIdActual = EstatusManualId,
            @EstatusChecadorIdActual = EstatusChecadorId
        FROM dbo.Incidencias 
        WHERE IncidenciaId = @IncidenciaId;

        IF @EmpleadoId IS NULL
        BEGIN
            THROW 51000, 'La incidencia especificada no existe.', 1;
        END

        -- 2. BIT�CORA DE CONTEXTO 
        INSERT INTO dbo.IncidenciasBitacora (
            IncidenciaId, UsuarioId, Accion, Comentario, 
            EstadoNuevo, EstadoAnterior,
            EstatusManualId_Anterior, 
            EstatusChecadorId_Anterior, 
            FechaMovimiento
        )
        VALUES (
            @IncidenciaId, 
            @UsuarioAccionId, 
            'CorreccionManual', 
            'Se aplico correccion desde el panel de incidencias: ' + ISNULL(@NuevoEstatusAbrev, 'Limpiar') + '. ' + ISNULL(@Comentario, ''), 
            @EstadoActual, 
            @EstadoActual,
            @EstatusManualIdActual,
            @EstatusChecadorIdActual,
            GETDATE()
        );

        -- 3. DELEGAR AL N�CLEO CENTRAL
        EXEC [dbo].[sp_FichasAsistencia_SaveManual]
            @EmpleadoId = @EmpleadoId,
            @Fecha = @Fecha,
            @EstatusManualAbrev = @NuevoEstatusAbrev,
            @Comentarios = @Comentario,
            @UsuarioId = @UsuarioAccionId;

        COMMIT TRANSACTION;
        
        SELECT 'Correccion aplicada y re-analisis ejecutado.' as Mensaje;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 51000, @Msg, 1;
    END CATCH
END
GO