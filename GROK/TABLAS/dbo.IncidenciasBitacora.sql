CREATE TABLE [dbo].[IncidenciasBitacora] (

[BitacoraId] int IDENTITY(1,1) NOT NULL,
[IncidenciaId] int NOT NULL,
[UsuarioId] int NOT NULL,
[FechaMovimiento] datetime DEFAULT (getdate()) NULL,
[Accion] varchar(50) NOT NULL,
[Comentario] nvarchar NULL,
[EstadoNuevo] varchar(20) NULL,
[AsignadoA_Anterior] int NULL,
[AsignadoA_Nuevo] int NULL,
[EstadoAnterior] varchar(20) NULL,
CONSTRAINT [PK__Incidenc__7ACF9B38C05AF45D] PRIMARY KEY CLUSTERED ([BitacoraId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[IncidenciasBitacora] ADD CONSTRAINT [FK_Bitacora_Incidencia] FOREIGN KEY([IncidenciaId]) REFERENCES [dbo].[Incidencias]([IncidenciaId]);
