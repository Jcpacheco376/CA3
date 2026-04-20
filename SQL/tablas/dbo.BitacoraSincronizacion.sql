-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[BitacoraSincronizacion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='BitacoraSincronizacion' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[BitacoraSincronizacion] (
    [BitacoraId] int IDENTITY(1,1) NOT NULL,
    [DispositivoId] int NULL,
    [FechaHora] datetime NULL CONSTRAINT [DF__BitacoraS__Fecha__747A15E9] DEFAULT (getdate()),
    [TipoEvento] nvarchar(50) NULL,
    [Detalle] nvarchar(MAX) NULL,
    [Estado] nvarchar(20) NULL,
    CONSTRAINT [PK__Bitacora__7ACF9B38CA09A002] PRIMARY KEY CLUSTERED ([BitacoraId])
    );
END
GO