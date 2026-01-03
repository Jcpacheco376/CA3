IF OBJECT_ID('dbo.sp_Incidencias_ObtenerPosiblesSoluciones') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_ObtenerPosiblesSoluciones;
GO

-- 8. sp_Incidencias_ObtenerPosiblesSoluciones
-- Actualizado: EstatusSupervisorId -> EstatusManualId
CREATE   PROCEDURE [dbo].[sp_Incidencias_ObtenerPosiblesSoluciones]
    @IncidenciaId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EstatusActualId INT;
    SELECT @EstatusActualId = EstatusManualId FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId; -- <--- CAMBIO

    SELECT EstatusId, Abreviatura, Descripcion
    FROM dbo.CatalogoEstatusAsistencia
    WHERE Activo = 1 AND EstatusId <> ISNULL(@EstatusActualId, -1)
    ORDER BY Abreviatura;
END

