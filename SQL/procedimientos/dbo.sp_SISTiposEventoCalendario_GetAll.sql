-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_SISTiposEventoCalendario_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
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