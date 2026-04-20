-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Incidencias_ObtenerPosiblesSoluciones]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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
        ColorUI, 
        PermiteComentario,
		VisibleSupervisor
    FROM dbo.CatalogoEstatusAsistencia
    WHERE Activo = 1 
      AND EstatusId <> ISNULL(@EstatusActualId, -1)
	  and VisibleSupervisor = 1
    ORDER BY EstatusId;
END
GO