-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[_JON]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='_JON' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[_JON] (
    [ID] int IDENTITY(1,1) NOT NULL,
    [JSON] varchar(MAX) NULL,
    PRIMARY KEY CLUSTERED ([ID])
    );
END
GO