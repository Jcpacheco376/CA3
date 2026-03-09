-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[SolicitudesVacaciones]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SolicitudesVacaciones' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[SolicitudesVacaciones] (
    [SolicitudId] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [FechaInicio] date NOT NULL,
    [FechaFin] date NOT NULL,
    [DiasSolicitados] int NOT NULL,
    [Comentarios] nvarchar(MAX) NULL,
    [Estatus] varchar(20) NULL CONSTRAINT [DF__Solicitud__Estat__15A5FF8A] DEFAULT ('Pendiente'),
    [UsuarioAutorizoId] int NULL,
    [FechaSolicitud] datetime NULL CONSTRAINT [DF__Solicitud__Fecha__178E47FC] DEFAULT (getdate()),
    [FechaRespuesta] datetime NULL,
    [UsuarioSolicitanteId] int NULL,
    CONSTRAINT [PK__Solicitu__85E95DC7B6D8C825] PRIMARY KEY CLUSTERED ([SolicitudId])
    );
END
GO