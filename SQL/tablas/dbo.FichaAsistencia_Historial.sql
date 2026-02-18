CREATE TABLE [dbo].[FichaAsistencia_Historial] (

[HistorialId] int IDENTITY(-2000000000,1) NOT NULL,
[FichaId] int NOT NULL,
[EmpleadoId] int NOT NULL,
[Fecha] date NOT NULL,
[HorarioId] int NULL,
[HoraEntrada] datetime NULL,
[HoraSalida] datetime NULL,
[EstatusChecadorId] int NULL,
[EstatusManualId] int NULL,
[Estado] varchar(20) DEFAULT ('BORRADOR') NOT NULL,
[IncidenciaActivaId] int NULL,
[ModificadoPorUsuarioId] int NULL,
[FechaModificacion] datetime NULL,
[Comentarios] nvarchar(510) NULL,
[VentanaInicio] datetime NULL,
[VentanaFin] datetime NULL,
[FechaCambioHistorial] datetime DEFAULT (getdate()) NULL,
[Accion] char(1) NULL,
CONSTRAINT [PK__FichaAsi__9752068F85197EBC] PRIMARY KEY CLUSTERED ([HistorialId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
