-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Roles]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Roles' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Roles] (
    [RoleId] int IDENTITY(1,1) NOT NULL,
    [NombreRol] nvarchar(50) NOT NULL,
    [Descripcion] nvarchar(255) NULL,
    [FechaCreacion] datetime NULL CONSTRAINT [DF__Roles__FechaCrea__7720AD13] DEFAULT (getdate()),
    CONSTRAINT [PK__Roles__8AFACE1A619C55FA] PRIMARY KEY CLUSTERED ([RoleId])
    );
END
GO