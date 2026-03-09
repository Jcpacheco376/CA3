-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoDepartamentos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
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
    CONSTRAINT [PK__Catalogo__66BB0E3E7076A78A] PRIMARY KEY CLUSTERED ([DepartamentoId])
    );
END
GO