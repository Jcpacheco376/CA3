CREATE TABLE [dbo].[Incidencias] (

[IncidenciaId] int IDENTITY(1,1) NOT NULL,
[EmpleadoId] int NOT NULL,
[Fecha] date NOT NULL,
[TipoIncidenciaId] int NOT NULL,
[EstatusChecadorId] int NULL,
[EstatusManualId] int NULL,
[Estado] varchar(20) DEFAULT ('Nueva') NOT NULL,
[AsignadoAUsuarioId] int NULL,
[NivelSeveridad] varchar(20) DEFAULT ('Info') NOT NULL,
[RequiereAutorizacion] bit DEFAULT ((0)) NULL,
[FechaCreacion] datetime DEFAULT (getdate()) NULL,
[FechaCierre] datetime NULL,
[ResueltoPorUsuarioId] int NULL,
CONSTRAINT [PK__Incidenc__E41133E61FB1FE1B] PRIMARY KEY CLUSTERED ([IncidenciaId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[Incidencias] ADD CONSTRAINT [FK_Incidencias_Empleados] FOREIGN KEY([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]);
ALTER TABLE [dbo].[Incidencias] ADD CONSTRAINT [FK_Incidencias_EstChecador] FOREIGN KEY([EstatusChecadorId]) REFERENCES [dbo].[CatalogoEstatusAsistencia]([EstatusId]);
ALTER TABLE [dbo].[Incidencias] ADD CONSTRAINT [FK_Incidencias_EstSupervisor] FOREIGN KEY([EstatusManualId]) REFERENCES [dbo].[CatalogoEstatusAsistencia]([EstatusId]);
ALTER TABLE [dbo].[Incidencias] ADD CONSTRAINT [FK_Incidencias_Tipo] FOREIGN KEY([TipoIncidenciaId]) REFERENCES [dbo].[CatalogoTiposIncidencia]([TipoIncidenciaId]);
ALTER TABLE [dbo].[Incidencias] ADD CONSTRAINT [FK_Incidencias_UsuarioAsignado] FOREIGN KEY([AsignadoAUsuarioId]) REFERENCES [dbo].[Usuarios]([UsuarioId]);
