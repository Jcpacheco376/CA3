-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_Asignar]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_Asignar]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Incidencias_Asignar]
    @IncidenciaId INT,
    @UsuarioAsignadoId INT,
    @Comentario NVARCHAR(255),
    @UsuarioAccionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. OBTENER FOTO ACTUAL (Contexto completo)
        DECLARE @EstadoAnterior VARCHAR(20);
        DECLARE @EstatusManualId INT;
        DECLARE @EstatusChecadorId INT;

        SELECT 
            @EstadoAnterior = Estado,
            @EstatusManualId = EstatusManualId,
            @EstatusChecadorId = EstatusChecadorId
        FROM dbo.Incidencias 
        WHERE IncidenciaId = @IncidenciaId;

        IF @EstadoAnterior IS NULL
        BEGIN
            THROW 51000, 'La incidencia no existe.', 1;
        END

        -- 2. ACTUALIZAR LA INCIDENCIA
        UPDATE dbo.Incidencias
        SET 
            AsignadoAUsuarioId = @UsuarioAsignadoId,
            Estado = 'Asignada'
        WHERE IncidenciaId = @IncidenciaId;

        -- 3. REGISTRAR EN BIT�CORA (FOTO COMPLETA)
        INSERT INTO dbo.IncidenciasBitacora (
            IncidenciaId, UsuarioId, Accion, Comentario, 
            AsignadoA_Nuevo, 
            EstadoNuevo, EstadoAnterior,
            EstatusManualId_Anterior, EstatusManualId_Nuevo,
            EstatusChecadorId_Anterior, EstatusChecadorId_Nuevo,
            FechaMovimiento
        )
        VALUES (
            @IncidenciaId, @UsuarioAccionId, 'Asignar', @Comentario, 
            @UsuarioAsignadoId, 
            'Asignada', @EstadoAnterior,
            @EstatusManualId, @EstatusManualId,     
            @EstatusChecadorId, @EstatusChecadorId,
            GETDATE()
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        THROW 51000, @ErrorMessage, 1;
    END CATCH
END
GO