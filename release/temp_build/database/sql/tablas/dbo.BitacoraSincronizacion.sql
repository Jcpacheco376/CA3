-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[BitacoraSincronizacion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
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
    PRIMARY KEY CLUSTERED ([BitacoraId])
    );
END
GO