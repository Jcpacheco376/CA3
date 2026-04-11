-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[VacacionesSaldosDetalle]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='VacacionesSaldosDetalle' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[VacacionesSaldosDetalle] (
    [DetalleId] int IDENTITY(1,1) NOT NULL,
    [SaldoId] int NOT NULL,
    [Fecha] date NOT NULL,
    [Dias] decimal(10, 2) NOT NULL,
    [Descripcion] varchar(255) NULL,
    [FechaRegistro] datetime NULL CONSTRAINT [DF__Vacacione__Fecha__47FC752D] DEFAULT (getdate()),
    [Tipo] varchar(50) NOT NULL CONSTRAINT [DF__Vacaciones__Tipo__4BCD0611] DEFAULT ('Disfrutado'),
    CONSTRAINT [PK__Vacacion__6E19D6DA5C32FE99] PRIMARY KEY CLUSTERED ([DetalleId])
    );
END
GO