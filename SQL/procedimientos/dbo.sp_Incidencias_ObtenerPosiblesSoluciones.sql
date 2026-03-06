-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_ObtenerPosiblesSoluciones]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Incidencias_ObtenerPosiblesSoluciones]
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
        ColorUI, -- �Crucial para el dise�o visual!
        PermiteComentario,
		VisibleSupervisor
    FROM dbo.CatalogoEstatusAsistencia
    WHERE Activo = 1 
      AND EstatusId <> ISNULL(@EstatusActualId, -1)
	  and VisibleSupervisor = 1
    ORDER BY EstatusId;
END
GO