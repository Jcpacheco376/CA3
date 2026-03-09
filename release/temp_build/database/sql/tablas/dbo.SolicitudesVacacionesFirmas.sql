-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[SolicitudesVacacionesFirmas]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SolicitudesVacacionesFirmas' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[SolicitudesVacacionesFirmas] (
    [FirmaId] int IDENTITY(1,1) NOT NULL,
    [SolicitudId] int NOT NULL,
    [ConfigId] int NOT NULL,
    [EstatusFirma] varchar(20) NULL CONSTRAINT [DF__Solicitud__Estat__220BD66F] DEFAULT ('Pendiente'),
    [UsuarioFirmaId] int NULL,
    [FechaFirma] datetime NULL,
    [Comentarios] nvarchar(250) NULL,
    CONSTRAINT [PK_SolicitudesVacacionesFirmas] PRIMARY KEY CLUSTERED ([FirmaId])
    );
END
GO