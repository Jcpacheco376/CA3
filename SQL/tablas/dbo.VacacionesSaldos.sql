-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[VacacionesSaldos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
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
    [FechaInicioPeriodo] date NULL,
    [FechaFinPeriodo] date NULL,
    CONSTRAINT [PK__Vacacion__FF916F69A01B3008] PRIMARY KEY CLUSTERED ([SaldoId])
    );
END
GO