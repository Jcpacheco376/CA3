-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[EventosCalendario]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='EventosCalendario' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[EventosCalendario] (
    [EventoId] int IDENTITY(1,1) NOT NULL,
    [Fecha] date NOT NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [Descripcion] nvarchar(500) NULL,
    [TipoEventoId] varchar(30) NOT NULL,
    [AplicaATodos] bit NOT NULL CONSTRAINT [DF__EventosCa__Aplic__094028A5] DEFAULT ((1)),
    [Activo] bit NOT NULL CONSTRAINT [DF__EventosCa__Activ__0A344CDE] DEFAULT ((1)),
    [CreadoPorUsuarioId] int NULL,
    [FechaCreacion] datetime NULL CONSTRAINT [DF__EventosCa__Fecha__0B287117] DEFAULT (getdate()),
    CONSTRAINT [PK_EventosCalendario] PRIMARY KEY CLUSTERED ([EventoId])
    );
END
GO