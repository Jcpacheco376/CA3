-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[IncidenciasBitacora]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='IncidenciasBitacora' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[IncidenciasBitacora] (
    [BitacoraId] int IDENTITY(1,1) NOT NULL,
    [IncidenciaId] int NOT NULL,
    [UsuarioId] int NOT NULL,
    [FechaMovimiento] datetime NULL CONSTRAINT [DF__Incidenci__Fecha__2FCFE5E1] DEFAULT (getdate()),
    [Accion] varchar(50) NOT NULL,
    [Comentario] nvarchar(MAX) NULL,
    [EstadoNuevo] varchar(20) NULL,
    [AsignadoA_Nuevo] int NULL,
    [EstadoAnterior] varchar(20) NULL,
    [EstatusManualId_Anterior] int NULL,
    [EstatusManualId_Nuevo] int NULL,
    [EstatusChecadorId_Anterior] int NULL,
    [EstatusChecadorId_Nuevo] int NULL,
    [ApelacionId] int NULL,
    CONSTRAINT [PK__Incidenc__7ACF9B38C05AF45D] PRIMARY KEY CLUSTERED ([BitacoraId])
    );
END
GO