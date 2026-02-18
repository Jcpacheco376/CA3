CREATE TABLE [dbo].[BitacoraSincronizacion] (

[BitacoraId] int IDENTITY(1,1) NOT NULL,
[DispositivoId] int NULL,
[FechaHora] datetime DEFAULT (getdate()) NULL,
[TipoEvento] nvarchar(100) NULL,
[Detalle] nvarchar NULL,
[Estado] nvarchar(40) NULL,
CONSTRAINT [PK__Bitacora__7ACF9B38CA09A002] PRIMARY KEY CLUSTERED ([BitacoraId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[BitacoraSincronizacion] ADD CONSTRAINT [FK__BitacoraS__Dispo__7385F1B0] FOREIGN KEY([DispositivoId]) REFERENCES [dbo].[Dispositivos]([DispositivoId]);
