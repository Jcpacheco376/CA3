-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[ConfiguracionIncidencias]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='ConfiguracionIncidencias' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[ConfiguracionIncidencias] (
    [ConfigId] int IDENTITY(1,1) NOT NULL,
    [CodigoRegla] varchar(50) NOT NULL,
    [EstatusSistemaId] int NULL,
    [EstatusManualId] int NULL,
    [NivelSeveridad] varchar(20) NOT NULL,
    [RequiereAutorizacion] bit NULL CONSTRAINT [DF__Configura__Requi__3F122971] DEFAULT ((0)),
    [MensajeError] nvarchar(255) NULL,
    [Activo] bit NULL CONSTRAINT [DF__Configura__Activ__40064DAA] DEFAULT ((1)),
    [TipoIncidenciaId] int NULL,
    CONSTRAINT [PK__Configur__C3BC335CCC9A48C5] PRIMARY KEY CLUSTERED ([ConfigId])
    );
END
GO