-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[IncidenciasAutorizaciones]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='IncidenciasAutorizaciones' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[IncidenciasAutorizaciones] (
    [AutorizacionId] int IDENTITY(1,1) NOT NULL,
    [IncidenciaId] int NOT NULL,
    [RolRequeridoId] int NOT NULL,
    [UsuarioAutorizoId] int NULL,
    [Estatus] varchar(20) NULL CONSTRAINT [DF__Incidenci__Estat__26467BA7] DEFAULT ('Pendiente'),
    [FechaRespuesta] datetime NULL,
    [Activo] bit NULL CONSTRAINT [DF__Incidenci__Activ__05A4A1EB] DEFAULT ((1)),
    [ApelacionId] int NULL CONSTRAINT [DF__Incidenci__Apela__0698C624] DEFAULT ((1)),
    CONSTRAINT [PK__Incidenc__08107FD51D472964] PRIMARY KEY CLUSTERED ([AutorizacionId])
    );
END
GO