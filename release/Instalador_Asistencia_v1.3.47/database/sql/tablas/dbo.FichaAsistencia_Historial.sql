-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[FichaAsistencia_Historial]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='FichaAsistencia_Historial' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[FichaAsistencia_Historial] (
    [HistorialId] int IDENTITY(1,1) NOT NULL,
    [FichaId] int NOT NULL,
    [EmpleadoId] int NOT NULL,
    [Fecha] date NOT NULL,
    [HorarioId] int NULL,
    [HoraEntrada] datetime NULL,
    [HoraSalida] datetime NULL,
    [EstatusChecadorId] int NULL,
    [EstatusManualId] int NULL,
    [Estado] varchar(20) NOT NULL CONSTRAINT [DF__FichaAsis__Estad__4CA12EB9] DEFAULT ('BORRADOR'),
    [IncidenciaActivaId] int NULL,
    [ModificadoPorUsuarioId] int NULL,
    [FechaModificacion] datetime NULL,
    [Comentarios] nvarchar(255) NULL,
    [VentanaInicio] datetime NULL,
    [VentanaFin] datetime NULL,
    [FechaCambioHistorial] datetime NULL CONSTRAINT [DF__FichaAsis__Fecha__4D9552F2] DEFAULT (getdate()),
    [Accion] char(1) NULL,
    CONSTRAINT [PK__FichaAsi__9752068F85197EBC] PRIMARY KEY CLUSTERED ([HistorialId])
    );
END
GO