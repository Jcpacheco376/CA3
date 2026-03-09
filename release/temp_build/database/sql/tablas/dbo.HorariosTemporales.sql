-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[HorariosTemporales]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='HorariosTemporales' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[HorariosTemporales] (
    [HorarioTemporalId] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [Fecha] date NOT NULL,
    [HorarioId] int NULL,
    [ModificadoPorUsuarioId] int NULL,
    [FechaModificacion] datetime NULL CONSTRAINT [DF__HorariosT__Fecha__22AAF4ED] DEFAULT (getdate()),
    [TipoAsignacion] char(1) NOT NULL CONSTRAINT [DF__HorariosT__TipoA__239F1926] DEFAULT ('H'),
    [HorarioDetalleId] int NULL,
    [EstatusConflictivo] nvarchar(255) NULL,
    PRIMARY KEY CLUSTERED ([HorarioTemporalId])
    );
END
GO