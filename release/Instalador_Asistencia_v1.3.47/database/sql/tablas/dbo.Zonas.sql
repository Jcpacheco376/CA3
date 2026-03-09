-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Zonas]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Zonas' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Zonas] (
    [ZonaId] int IDENTITY(1,1) NOT NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [Descripcion] nvarchar(255) NULL,
    [Activo] bit NULL CONSTRAINT [DF__Zonas__Activo__6537D259] DEFAULT ((1)),
    [ColorUI] varchar(100) NULL,
    CONSTRAINT [PK__Zonas__1F1E0576FF7229FD] PRIMARY KEY CLUSTERED ([ZonaId])
    );
END
GO