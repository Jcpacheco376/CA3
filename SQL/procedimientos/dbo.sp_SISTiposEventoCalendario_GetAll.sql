-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_SISTiposEventoCalendario_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_SISTiposEventoCalendario_GetAll]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        t.TipoEventoId,
        t.Nombre,
        t.Descripcion,
        t.LogicaCalculo,
        t.EstatusAsistenciaId,
        ea.Descripcion AS EstatusNombre,
        ea.Abreviatura AS EstatusAbreviatura,
        t.PermiteMultiplesMismoDia,
        t.PermiteMultiplesAnio,
        t.ColorUI,
        t.Icono,
        t.EsSistema,
        t.Activo,
        t.esGeneral
    FROM dbo.SISTiposEventoCalendario t
    LEFT JOIN dbo.CatalogoEstatusAsistencia ea ON t.EstatusAsistenciaId = ea.EstatusId
    WHERE t.Activo = 1
    ORDER BY t.Nombre;
END
GO