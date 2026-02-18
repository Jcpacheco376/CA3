CREATE TABLE [dbo].[ConfiguracionIncidencias] (

[ConfigId] int IDENTITY(1,1) NOT NULL,
[CodigoRegla] varchar(50) NOT NULL,
[EstatusSistemaId] int NULL,
[EstatusManualId] int NULL,
[NivelSeveridad] varchar(20) NOT NULL,
[RequiereAutorizacion] bit DEFAULT ((0)) NULL,
[MensajeError] nvarchar(510) NULL,
[Activo] bit DEFAULT ((1)) NULL,
[TipoIncidenciaId] int NULL,
CONSTRAINT [PK__Configur__C3BC335CCC9A48C5] PRIMARY KEY CLUSTERED ([ConfigId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[ConfiguracionIncidencias] ADD CONSTRAINT [FK_ConfigInc_Manual] FOREIGN KEY([EstatusManualId]) REFERENCES [dbo].[CatalogoEstatusAsistencia]([EstatusId]);
ALTER TABLE [dbo].[ConfiguracionIncidencias] ADD CONSTRAINT [FK_ConfigInc_Sistema] FOREIGN KEY([EstatusSistemaId]) REFERENCES [dbo].[CatalogoEstatusAsistencia]([EstatusId]);
ALTER TABLE [dbo].[ConfiguracionIncidencias] ADD CONSTRAINT [FK_Config_TipoIncidencia] FOREIGN KEY([TipoIncidenciaId]) REFERENCES [dbo].[CatalogoTiposIncidencia]([TipoIncidenciaId]);
ALTER TABLE [dbo].[ConfiguracionIncidencias] ADD CONSTRAINT [FK_ConfiguracionIncidencias_Tipo] FOREIGN KEY([TipoIncidenciaId]) REFERENCES [dbo].[CatalogoTiposIncidencia]([TipoIncidenciaId]);
