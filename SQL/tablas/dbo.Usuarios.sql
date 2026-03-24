-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Usuarios]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Usuarios' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Usuarios] (
    [UsuarioId] int NOT NULL,
    [NombreUsuario] nvarchar(50) NOT NULL,
    [PasswordHash] varbinary(MAX) NOT NULL,
    [NombreCompleto] nvarchar(100) NULL,
    [Email] nvarchar(100) NULL,
    [EstaActivo] bit NOT NULL CONSTRAINT [DF__Usuarios__EstaAc__76619304] DEFAULT ((1)),
    [FechaCreacion] datetime NOT NULL CONSTRAINT [DF__Usuarios__FechaC__7755B73D] DEFAULT (getdate()),
    [Theme] nvarchar(50) NULL,
    [AnimationsEnabled] bit NOT NULL CONSTRAINT [DF__Usuarios__Animat__7849DB76] DEFAULT ((1)),
    [DebeCambiarPassword] bit NOT NULL CONSTRAINT [DF__Usuarios__DebeCa__793DFFAF] DEFAULT ((0)),
    [TokenVersion] int NOT NULL CONSTRAINT [DF__Usuarios__TokenV__4DB4832C] DEFAULT ((1)),
    [EmpleadoId] int NULL,
    CONSTRAINT [PK__Usuarios__2B3DE7B818448526] PRIMARY KEY CLUSTERED ([UsuarioId])
    );
END
GO