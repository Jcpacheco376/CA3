-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Incidencias]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Incidencias' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Incidencias] (
    [IncidenciaId] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [Fecha] date NOT NULL,
    [TipoIncidenciaId] int NOT NULL,
    [EstatusChecadorId] int NULL,
    [EstatusManualId] int NULL,
    [Estado] varchar(20) NOT NULL CONSTRAINT [DF__Incidenci__Estad__04E587DC] DEFAULT ('Nueva'),
    [AsignadoAUsuarioId] int NULL,
    [NivelSeveridad] varchar(20) NOT NULL CONSTRAINT [DF__Incidenci__Nivel__05D9AC15] DEFAULT ('Info'),
    [RequiereAutorizacion] bit NULL CONSTRAINT [DF__Incidenci__Requi__06CDD04E] DEFAULT ((0)),
    [FechaCreacion] datetime NULL CONSTRAINT [DF__Incidenci__Fecha__07C1F487] DEFAULT (getdate()),
    [FechaCierre] datetime NULL,
    [ResueltoPorUsuarioId] int NULL,
    CONSTRAINT [PK__Incidenc__E41133E61FB1FE1B] PRIMARY KEY CLUSTERED ([IncidenciaId])
    );
END
GO