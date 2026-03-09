-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoPuestos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoPuestos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoPuestos] (
    [PuestoId] int IDENTITY(1,1) NOT NULL,
    [CodRef] nvarchar(10) NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [Activo] bit NOT NULL CONSTRAINT [DF__CatalogoP__Activ__1881A0DE] DEFAULT ((1)),
    CONSTRAINT [PK__Catalogo__F7F6C6045872112F] PRIMARY KEY CLUSTERED ([PuestoId])
    );
END
GO