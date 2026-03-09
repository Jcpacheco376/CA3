-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Checadas]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Checadas' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Checadas] (
    [ChecadaId] bigint IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [FechaHora] datetime NOT NULL,
    [Checador] nvarchar(100) NULL,
    PRIMARY KEY CLUSTERED ([ChecadaId])
    );
END
GO