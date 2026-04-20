-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[SISConfiguracion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SISConfiguracion' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[SISConfiguracion] (
    [ConfigId] int IDENTITY(1,1) NOT NULL,
    [ConfigKey] nvarchar(50) NOT NULL,
    [ConfigValue] nvarchar(50) NOT NULL,
    [Descripcion] nvarchar(255) NULL,
    CONSTRAINT [PK__Configur__C3BC335C280099B3] PRIMARY KEY CLUSTERED ([ConfigId])
    );
END
GO