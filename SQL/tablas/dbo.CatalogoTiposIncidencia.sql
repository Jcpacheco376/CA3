-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoTiposIncidencia]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoTiposIncidencia' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoTiposIncidencia] (
    [TipoIncidenciaId] int IDENTITY(1,1) NOT NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [Descripcion] nvarchar(255) NULL,
    [Activo] bit NOT NULL CONSTRAINT [DF__CatalogoT__Activ__52793849] DEFAULT ((1)),
    [Codigo] varchar(20) NOT NULL,
    CONSTRAINT [PK_CatalogoTiposIncidencia] PRIMARY KEY CLUSTERED ([TipoIncidenciaId])
    );
END
GO