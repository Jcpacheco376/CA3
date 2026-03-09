-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[UsuariosGruposNomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='UsuariosGruposNomina' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[UsuariosGruposNomina] (
    [UsuarioId] int NOT NULL,
    [GrupoNominaId] char(5) NOT NULL,
    CONSTRAINT [PK__Usuarios__69225BEC368169AA] PRIMARY KEY CLUSTERED ([UsuarioId], [GrupoNominaId])
    );
END
GO