-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[SISTiposEventoCalendario]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SISTiposEventoCalendario' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[SISTiposEventoCalendario] (
    [TipoEventoId] varchar(30) NOT NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [Descripcion] nvarchar(500) NULL,
    [LogicaCalculo] varchar(30) NOT NULL,
    [EstatusAsistenciaId] int NULL,
    [PermiteMultiplesMismoDia] bit NOT NULL CONSTRAINT [DF__TiposEven__Permi__7BE62D87] DEFAULT ((0)),
    [PermiteMultiplesAnio] bit NOT NULL CONSTRAINT [DF__TiposEven__Permi__7CDA51C0] DEFAULT ((1)),
    [ColorUI] nvarchar(30) NOT NULL CONSTRAINT [DF__TiposEven__Color__7DCE75F9] DEFAULT ('slate'),
    [Icono] nvarchar(50) NULL,
    [EsSistema] bit NOT NULL CONSTRAINT [DF__TiposEven__EsSis__7EC29A32] DEFAULT ((0)),
    [Activo] bit NOT NULL CONSTRAINT [DF__TiposEven__Activ__7FB6BE6B] DEFAULT ((1)),
    [esGeneral] bit NULL,
    CONSTRAINT [PK_TiposEventoCalendario] PRIMARY KEY CLUSTERED ([TipoEventoId])
    );
END
GO