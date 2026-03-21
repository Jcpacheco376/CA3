-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[UsuariosPuestos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='UsuariosPuestos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[UsuariosPuestos] (
    [UsuarioId] int NOT NULL,
    [PuestoId] int NOT NULL,
    CONSTRAINT [PK_UsuariosPuestos] PRIMARY KEY CLUSTERED ([UsuarioId], [PuestoId])
    );
END
GO