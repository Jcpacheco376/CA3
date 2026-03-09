-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoDepartamentos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoDepartamentos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoDepartamentos] (
    [DepartamentoId] int IDENTITY(1,1) NOT NULL,
    [CodRef] nvarchar(10) NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [Abreviatura] nvarchar(10) NULL,
    [Activo] bit NOT NULL CONSTRAINT [DF__CatalogoD__Activ__10E07F16] DEFAULT ((1)),
    PRIMARY KEY CLUSTERED ([DepartamentoId])
    );
END
GO