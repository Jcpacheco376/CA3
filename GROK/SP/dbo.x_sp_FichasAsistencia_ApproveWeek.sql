IF OBJECT_ID('dbo.x_sp_FichasAsistencia_ApproveWeek') IS NOT NULL      DROP PROCEDURE dbo.x_sp_FichasAsistencia_ApproveWeek;
GO

CREATE PROCEDURE [dbo].[sp_FichasAsistencia_ApproveWeek]
    @UsuarioId INT,
    @EmpleadoId INT,
    @FechaInicioSemana DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Aprobar la semana significa: "Lo que calculó el sistema es correcto, hazlo oficial".
    UPDATE dbo.FichaAsistencia
    SET 
        EstatusManualId = EstatusChecadorId, -- Copiamos el estatus automático al manual
        ModificadoPorUsuarioId = @UsuarioId,
        FechaModificacion = GETDATE(),
        Estado = 'VALIDADO' -- <--- CAMBIO CLAVE: Se vuelve oficial
    WHERE 
        EmpleadoId = @EmpleadoId
        AND Fecha >= @FechaInicioSemana
        AND Fecha < DATEADD(DAY, 7, @FechaInicioSemana)
        -- SOLO afectamos borradores.
        -- Si ya estaba 'VALIDADO' (se corrigió manualmente un día) o 'BLOQUEADO', no lo sobrescribimos.
        AND Estado = 'BORRADOR'; 
END

