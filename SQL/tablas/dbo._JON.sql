-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[_JON]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='_JON' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[_JON] (
    [ID] int IDENTITY(1,1) NOT NULL,
    [JSON] varchar(MAX) NULL,
    CONSTRAINT [PK__JON__3214EC27B952011D] PRIMARY KEY CLUSTERED ([ID])
    );
END
GO