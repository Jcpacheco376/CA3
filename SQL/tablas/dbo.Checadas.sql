-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Checadas]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Checadas' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Checadas] (
    [ChecadaId] bigint IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [FechaHora] datetime NOT NULL,
    [Checador] nvarchar(100) NULL,
    CONSTRAINT [PK__Checadas__E09D0857F5FF0142] PRIMARY KEY CLUSTERED ([ChecadaId])
    );
END
GO