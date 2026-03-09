-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[EmpleadosZonas]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='EmpleadosZonas' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[EmpleadosZonas] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [ZonaId] int NOT NULL,
    PRIMARY KEY CLUSTERED ([Id])
    );
END
GO