-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoConceptosNomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoConceptosNomina' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoConceptosNomina] (
    [ConceptoId] int IDENTITY(1,1) NOT NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [Abreviatura] char(6) NULL,
    [CodRef] nvarchar(50) NOT NULL,
    [Activo] bit NULL CONSTRAINT [DF__CatalogoC__Activ__625B65AE] DEFAULT ((1)),
    CONSTRAINT [PK_CatalogoConceptosNomina] PRIMARY KEY CLUSTERED ([ConceptoId])
    );
END
GO