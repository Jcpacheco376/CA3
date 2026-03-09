-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[JON]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.24
-- Compilado:           05/03/2026, 15:42:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='JON' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[JON] (
    [ID] int IDENTITY(1,1) NOT NULL,
    [JSON] varchar(MAX) NULL,
    CONSTRAINT [PK__JON__3214EC27B952011D] PRIMARY KEY CLUSTERED ([ID])
    );
END
GO