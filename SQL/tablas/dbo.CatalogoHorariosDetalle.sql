CREATE TABLE [dbo].[CatalogoHorariosDetalle] (

[HorarioDetalleId] int IDENTITY(1,1) NOT NULL,
[HorarioId] int NOT NULL,
[DiaSemana] int NOT NULL,
[EsDiaLaboral] bit DEFAULT ((0)) NOT NULL,
[HoraEntrada] time NULL,
[HoraSalida] time NULL,
[HoraInicioComida] time NULL,
[HoraFinComida] time NULL,
[MinutosAntesEntrada] int DEFAULT ((120)) NOT NULL,
[MinutosDespuesSalida] int DEFAULT ((240)) NOT NULL,
CONSTRAINT [PK__HorarioD__3A5CF92BAE676948] PRIMARY KEY CLUSTERED ([HorarioDetalleId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ_Horario_DiaSemana] UNIQUE NONCLUSTERED ([HorarioId] ASC, [DiaSemana] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[CatalogoHorariosDetalle] ADD CONSTRAINT [FK__HorarioDe__Horar__2AA05119] FOREIGN KEY([HorarioId]) REFERENCES [dbo].[CatalogoHorarios]([HorarioId]);
