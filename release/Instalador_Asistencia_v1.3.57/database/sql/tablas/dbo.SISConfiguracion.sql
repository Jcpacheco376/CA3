-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[SISConfiguracion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SISConfiguracion' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[SISConfiguracion] (
    [ConfigId] int IDENTITY(1,1) NOT NULL,
    [ConfigKey] nvarchar(50) NOT NULL,
    [ConfigValue] nvarchar(50) NOT NULL,
    [Descripcion] nvarchar(255) NULL,
    [FormatoNombre] int NULL CONSTRAINT [DF__Configura__Forma__6CA3E9F7] DEFAULT ((1)),
    CONSTRAINT [PK__Configur__C3BC335C280099B3] PRIMARY KEY CLUSTERED ([ConfigId])
    );
END
GO