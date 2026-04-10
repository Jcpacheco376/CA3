CREATE TABLE [dbo].[BitacoraProcesosAutomaticos](
	[BitacoraId] [int] IDENTITY(1,1) NOT NULL,
	[ProcesoId] [int] NOT NULL,
	[FechaHoraInicio] [datetime] NOT NULL,
	[FechaHoraFin] [datetime] NULL,
	[Estatus] [nvarchar](50) NOT NULL,
	[MensajeLog] [nvarchar](max) NULL,
 CONSTRAINT [PK_BitacoraProcesosAutomaticos] PRIMARY KEY CLUSTERED 
(
	[BitacoraId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [dbo].[BitacoraProcesosAutomaticos]  WITH CHECK ADD  CONSTRAINT [FK_BitacoraProcesos_Procesos] FOREIGN KEY([ProcesoId])
REFERENCES [dbo].[CatalogoProcesosAutomaticos] ([ProcesoId])
ON DELETE CASCADE
GO

ALTER TABLE [dbo].[BitacoraProcesosAutomaticos] CHECK CONSTRAINT [FK_BitacoraProcesos_Procesos]
GO

ALTER TABLE [dbo].[BitacoraProcesosAutomaticos] ADD  CONSTRAINT [DF_BitacoraProcesos_FechaInicio]  DEFAULT (getdate()) FOR [FechaHoraInicio]
GO
