-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_EventosCalendario_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_EventosCalendario_GetAll]
AS
BEGIN
    SET NOCOUNT ON;
    -- Recordset 1: Eventos con info del tipo
    SELECT 
        ec.EventoId,
        ec.Fecha,
        ec.Nombre,
        ec.Descripcion,
        ec.TipoEventoId,
        t.Nombre        AS TipoEventoNombre,
        t.LogicaCalculo,
        t.ColorUI        AS TipoColorUI,
        t.Icono          AS TipoIcono,
        ec.Icono         AS EventoIcono,
        ec.AplicaATodos,
        ec.Activo
    FROM dbo.EventosCalendario ec
    INNER JOIN dbo.SISTiposEventoCalendario t ON ec.TipoEventoId = t.TipoEventoId
    ORDER BY ec.Fecha DESC;
    -- Recordset 2: Filtros de todos los eventos
    SELECT
        f.FiltroId,
        f.EventoId,
        f.GrupoRegla,
        f.Dimension,
        f.ValorId,
        CASE f.Dimension
            WHEN 'DEPARTAMENTO'    THEN d.Nombre
            WHEN 'GRUPO_NOMINA'    THEN g.Nombre
            WHEN 'PUESTO'          THEN p.Nombre
            WHEN 'ESTABLECIMIENTO' THEN e.Nombre
        END AS ValorNombre
    FROM dbo.EventosCalendarioFiltros f
    LEFT JOIN dbo.CatalogoDepartamentos d    ON f.Dimension = 'DEPARTAMENTO'    AND f.ValorId = d.DepartamentoId
    LEFT JOIN dbo.CatalogoGruposNomina g     ON f.Dimension = 'GRUPO_NOMINA'    AND f.ValorId = g.GrupoNominaId
    LEFT JOIN dbo.CatalogoPuestos p          ON f.Dimension = 'PUESTO'          AND f.ValorId = p.PuestoId
    LEFT JOIN dbo.CatalogoEstablecimientos e ON f.Dimension = 'ESTABLECIMIENTO' AND f.ValorId = e.EstablecimientoId
    ORDER BY f.EventoId, f.Dimension;
END
GO