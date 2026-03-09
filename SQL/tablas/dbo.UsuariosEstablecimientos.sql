-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[UsuariosEstablecimientos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='UsuariosEstablecimientos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[UsuariosEstablecimientos] (
    [UsuarioId] int NOT NULL,
    [EstablecimientoId] int NOT NULL,
    CONSTRAINT [PK_UsuariosEstablecimientos] PRIMARY KEY CLUSTERED ([UsuarioId], [EstablecimientoId])
    );
END
GO