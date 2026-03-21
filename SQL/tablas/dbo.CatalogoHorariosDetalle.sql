-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoHorariosDetalle]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoHorariosDetalle' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoHorariosDetalle] (
    [HorarioDetalleId] int IDENTITY(1,1) NOT NULL,
    [HorarioId] int NOT NULL,
    [DiaSemana] int NOT NULL,
    [EsDiaLaboral] bit NOT NULL CONSTRAINT [DF__HorarioDe__EsDia__2B947552] DEFAULT ((0)),
    [HoraEntrada] time NULL,
    [HoraSalida] time NULL,
    [HoraInicioComida] time NULL,
    [HoraFinComida] time NULL,
    [MinutosAntesEntrada] int NOT NULL CONSTRAINT [DF__CatalogoH__Minut__5E4ADDA8] DEFAULT ((120)),
    [MinutosDespuesSalida] int NOT NULL CONSTRAINT [DF__CatalogoH__Minut__5F3F01E1] DEFAULT ((240)),
    CONSTRAINT [PK__HorarioD__3A5CF92BAE676948] PRIMARY KEY CLUSTERED ([HorarioDetalleId])
    );
END
GO