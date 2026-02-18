IF OBJECT_ID('dbo.sp_Incidencias_ObtenerPosiblesSoluciones') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_ObtenerPosiblesSoluciones;
GO
CREATE   PROCEDURE [dbo].[sp_Incidencias_ObtenerPosiblesSoluciones]
    @IncidenciaId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @EstatusActualId INT;
    SELECT @EstatusActualId = EstatusManualId FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId;

    SELECT 
        EstatusId, 
        Abreviatura, 
        Descripcion,
        ColorUI, -- ¡Crucial para el diseño visual!
        PermiteComentario,
		VisibleSupervisor
    FROM dbo.CatalogoEstatusAsistencia
    WHERE Activo = 1 
      AND EstatusId <> ISNULL(@EstatusActualId, -1)
	  and VisibleSupervisor = 1
    ORDER BY EstatusId;
END


