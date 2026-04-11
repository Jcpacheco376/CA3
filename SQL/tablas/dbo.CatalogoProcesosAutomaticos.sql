-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoProcesosAutomaticos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoProcesosAutomaticos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoProcesosAutomaticos] (
    [ProcesoId] int IDENTITY(1,1) NOT NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [KeyInterna] nvarchar(50) NOT NULL,
    [Descripcion] nvarchar(500) NULL,
    [CronExpression] nvarchar(50) NOT NULL,
    [Activo] bit NOT NULL CONSTRAINT [DF_CatalogoProcesosAutomaticos_Activo] DEFAULT ((1)),
    [UltimaEjecucion] datetime NULL,
    [UltimoEstatus] nvarchar(50) NULL,
    CONSTRAINT [PK_CatalogoProcesosAutomaticos] PRIMARY KEY CLUSTERED ([ProcesoId])
    );
END
GO