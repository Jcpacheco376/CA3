-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoGruposNomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoGruposNomina' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoGruposNomina] (
    [GrupoNominaId] int IDENTITY(1,1) NOT NULL,
    [CodRef] nvarchar(10) NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [Abreviatura] nvarchar(10) NULL,
    [Activo] bit NOT NULL CONSTRAINT [DF__CatalogoG__Activ__14B10FFA] DEFAULT ((1)),
    [Periodo] varchar(10) NULL,
    PRIMARY KEY CLUSTERED ([GrupoNominaId])
    );
END
GO