CREATE TABLE [dbo].[IncidenciasAutorizaciones] (

[AutorizacionId] int IDENTITY(1,1) NOT NULL,
[IncidenciaId] int NOT NULL,
[RolRequeridoId] int NOT NULL,
[UsuarioAutorizoId] int NULL,
[Estatus] varchar(20) DEFAULT ('Pendiente') NULL,
[FechaRespuesta] datetime NULL,
CONSTRAINT [PK__Incidenc__08107FD51D472964] PRIMARY KEY CLUSTERED ([AutorizacionId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[IncidenciasAutorizaciones] ADD CONSTRAINT [FK_Autorizaciones_Incidencia] FOREIGN KEY([IncidenciaId]) REFERENCES [dbo].[Incidencias]([IncidenciaId]);
ALTER TABLE [dbo].[IncidenciasAutorizaciones] ADD CONSTRAINT [FK_Autorizaciones_Usuario] FOREIGN KEY([UsuarioAutorizoId]) REFERENCES [dbo].[Usuarios]([UsuarioId]);
ALTER TABLE [dbo].[IncidenciasAutorizaciones] ADD CONSTRAINT [FK_Autorizaciones_Rol] FOREIGN KEY([RolRequeridoId]) REFERENCES [dbo].[Roles]([RoleId]);
