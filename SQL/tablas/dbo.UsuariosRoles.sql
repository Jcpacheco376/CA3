-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[UsuariosRoles]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='UsuariosRoles' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[UsuariosRoles] (
    [UsuarioId] int NOT NULL,
    [RoleId] int NOT NULL,
    [EsPrincipal] bit NOT NULL CONSTRAINT [DF__UsuariosR__EsPri__1D2725C1] DEFAULT ((0)),
    CONSTRAINT [PK__Usuarios__93924B593806F1F0] PRIMARY KEY CLUSTERED ([UsuarioId], [RoleId])
    );
END
GO