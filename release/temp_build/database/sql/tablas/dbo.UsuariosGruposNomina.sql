-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[UsuariosGruposNomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='UsuariosGruposNomina' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[UsuariosGruposNomina] (
    [UsuarioId] int NOT NULL,
    [GrupoNominaId] char(5) NOT NULL,
    PRIMARY KEY CLUSTERED ([UsuarioId], [GrupoNominaId])
    );
END
GO