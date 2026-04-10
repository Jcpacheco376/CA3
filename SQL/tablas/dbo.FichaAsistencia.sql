-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[FichaAsistencia]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FichaAsistencia' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[FichaAsistencia] (
    [FichaId] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [Fecha] date NOT NULL,
    [HorarioId] int NULL,
    [HoraEntrada] datetime NULL,
    [HoraSalida] datetime NULL,
    [EstatusChecadorId] int NULL,
    [EstatusManualId] int NULL,
    [Estado] varchar(20) NOT NULL CONSTRAINT [DF__FichaAsis__Estad__46E85563] DEFAULT ('BORRADOR'),
    [IncidenciaActivaId] int NULL,
    [ModificadoPorUsuarioId] int NULL,
    [FechaModificacion] datetime NULL,
    [Comentarios] nvarchar(255) NULL,
    [VentanaInicio] datetime NULL,
    [VentanaFin] datetime NULL,
    CONSTRAINT [PK__FichaAsi__0C37E560E9F1364B] PRIMARY KEY CLUSTERED ([FichaId])
    );
END
GO