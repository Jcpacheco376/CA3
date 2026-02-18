CREATE TABLE [dbo].[FichaAsistencia] (

[FichaId] int IDENTITY(-2000000000,1) NOT NULL,
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
CONSTRAINT [PK__FichaAsi__0C37E560E9F1364B] PRIMARY KEY CLUSTERED ([FichaId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ_Ficha_EmpleadoFecha] UNIQUE NONCLUSTERED ([EmpleadoId] ASC, [Fecha] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[FichaAsistencia] ADD CONSTRAINT [FK_Ficha_Empleado] FOREIGN KEY([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]);
ALTER TABLE [dbo].[FichaAsistencia] ADD CONSTRAINT [FK_Ficha_EstChecador] FOREIGN KEY([EstatusChecadorId]) REFERENCES [dbo].[CatalogoEstatusAsistencia]([EstatusId]);
ALTER TABLE [dbo].[FichaAsistencia] ADD CONSTRAINT [FK_Ficha_EstManual] FOREIGN KEY([EstatusManualId]) REFERENCES [dbo].[CatalogoEstatusAsistencia]([EstatusId]);
