CREATE TABLE [dbo].[EventosCalendario](
	[EventoId] [int] IDENTITY(1,1) NOT NULL,
	[Fecha] [date] NOT NULL,
	[Nombre] [nvarchar](100) NOT NULL,
	[Descripcion] [nvarchar](500) NULL,
	[TipoEventoId] [varchar](30) NOT NULL,
	[AplicaATodos] [bit] NOT NULL DEFAULT(1),
	[Activo] [bit] NOT NULL DEFAULT ((1)),
    [CreadoPorUsuarioId] [int] NULL,
    [FechaCreacion] [datetime] DEFAULT (getdate()),
 CONSTRAINT [PK_EventosCalendario] PRIMARY KEY CLUSTERED 
(
	[EventoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[EventosCalendario] WITH CHECK ADD CONSTRAINT [FK_EventosCalendario_TipoEvento]
    FOREIGN KEY([TipoEventoId]) REFERENCES [dbo].[TiposEventoCalendario]([TipoEventoId]);
GO

ALTER TABLE [dbo].[EventosCalendario] CHECK CONSTRAINT [FK_EventosCalendario_TipoEvento]
GO
