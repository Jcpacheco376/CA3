-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[BitacoraProcesosAutomaticos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='BitacoraProcesosAutomaticos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[BitacoraProcesosAutomaticos] (
    [BitacoraId] int IDENTITY(1,1) NOT NULL,
    [ProcesoId] int NOT NULL,
    [FechaHoraInicio] datetime NOT NULL CONSTRAINT [DF_BitacoraProcesos_FechaInicio] DEFAULT (getdate()),
    [FechaHoraFin] datetime NULL,
    [Estatus] nvarchar(50) NOT NULL,
    [MensajeLog] nvarchar(MAX) NULL,
    CONSTRAINT [PK_BitacoraProcesosAutomaticos] PRIMARY KEY CLUSTERED ([BitacoraId])
    );
END
GO