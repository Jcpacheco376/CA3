CREATE TABLE [dbo].[CatalogoProcesosAutomaticos](
	[ProcesoId] [int] IDENTITY(1,1) NOT NULL,
	[Nombre] [nvarchar](100) NOT NULL,
	[KeyInterna] [nvarchar](50) NOT NULL,
	[Descripcion] [nvarchar](500) NULL,
	[CronExpression] [nvarchar](50) NOT NULL,
	[Activo] [bit] NOT NULL,
	[UltimaEjecucion] [datetime] NULL,
	[UltimoEstatus] [nvarchar](50) NULL,
 CONSTRAINT [PK_CatalogoProcesosAutomaticos] PRIMARY KEY CLUSTERED 
(
	[ProcesoId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [UQ_CatalogoProcesos_KeyInterna] UNIQUE NONCLUSTERED 
(
	[KeyInterna] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[CatalogoProcesosAutomaticos] ADD  CONSTRAINT [DF_CatalogoProcesosAutomaticos_Activo]  DEFAULT ((1)) FOR [Activo]
GO
