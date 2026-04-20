-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[EmpleadosZonas]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='EmpleadosZonas' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[EmpleadosZonas] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [ZonaId] int NOT NULL,
    CONSTRAINT [PK__Empleado__3214EC07C503631F] PRIMARY KEY CLUSTERED ([Id])
    );
END
GO