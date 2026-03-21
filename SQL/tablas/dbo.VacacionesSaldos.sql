-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[VacacionesSaldos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='VacacionesSaldos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[VacacionesSaldos] (
    [SaldoId] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [Anio] int NOT NULL,
    [DiasOtorgados] int NOT NULL CONSTRAINT [DF__Vacacione__DiasO__10E14A6D] DEFAULT ((0)),
    [DiasDisfrutados] int NOT NULL CONSTRAINT [DF__Vacacione__DiasD__11D56EA6] DEFAULT ((0)),
    [DiasAjuste] decimal(10, 2) NOT NULL CONSTRAINT [DF__Vacacione__DiasA__442BE449] DEFAULT ((0)),
    [DiasPagados] decimal(10, 2) NOT NULL CONSTRAINT [DF__Vacacione__DiasP__45200882] DEFAULT ((0)),
    [DiasRestantes] decimal(15, 2) NULL,
    [FechaInicioPeriodo] date NULL,
    [FechaFinPeriodo] date NULL,
    CONSTRAINT [PK__Vacacion__FF916F69A01B3008] PRIMARY KEY CLUSTERED ([SaldoId])
    );
END
GO