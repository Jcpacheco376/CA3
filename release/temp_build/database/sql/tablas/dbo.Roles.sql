-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Roles]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Roles' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Roles] (
    [RoleId] int IDENTITY(1,1) NOT NULL,
    [NombreRol] nvarchar(50) NOT NULL,
    [Descripcion] nvarchar(255) NULL,
    [FechaCreacion] datetime NULL CONSTRAINT [DF__Roles__FechaCrea__7720AD13] DEFAULT (getdate()),
    PRIMARY KEY CLUSTERED ([RoleId])
    );
END
GO