-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Dispositivos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Dispositivos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Dispositivos] (
    [DispositivoId] int IDENTITY(1,1) NOT NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [IpAddress] nvarchar(50) NULL,
    [Puerto] int NULL CONSTRAINT [DF__Dispositi__Puert__68143F04] DEFAULT ((4370)),
    [ZonaId] int NULL,
    [TipoConexion] nvarchar(20) NULL CONSTRAINT [DF__Dispositi__TipoC__69FC8776] DEFAULT ('SDK'),
    [NumeroSerie] nvarchar(100) NULL,
    [UltimaSincronizacion] datetime NULL,
    [Estado] nvarchar(20) NULL CONSTRAINT [DF__Dispositi__Estad__6AF0ABAF] DEFAULT ('Desconectado'),
    [Activo] bit NULL CONSTRAINT [DF__Dispositi__Activ__6BE4CFE8] DEFAULT ((1)),
    [PasswordCom] nvarchar(20) NULL,
    [Firmware] nvarchar(50) NULL,
    [Plataforma] nvarchar(50) NULL,
    [TotalUsuarios] int NULL CONSTRAINT [DF__Dispositi__Total__756E3A22] DEFAULT ((0)),
    [TotalHuellas] int NULL CONSTRAINT [DF__Dispositi__Total__76625E5B] DEFAULT ((0)),
    [TotalRostros] int NULL CONSTRAINT [DF__Dispositi__Total__77568294] DEFAULT ((0)),
    [TotalRegistros] int NULL CONSTRAINT [DF__Dispositi__Total__784AA6CD] DEFAULT ((0)),
    [DireccionADMS] nvarchar(100) NULL,
    [HoraDispositivo] datetime NULL,
    [BorrarChecadas] bit NOT NULL CONSTRAINT [DF__Dispositi__Borra__7A32EF3F] DEFAULT ((0)),
    CONSTRAINT [PK__Disposit__724C27A11D3462C5] PRIMARY KEY CLUSTERED ([DispositivoId])
    );
END
GO