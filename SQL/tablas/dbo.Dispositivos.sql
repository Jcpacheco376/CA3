CREATE TABLE [dbo].[Dispositivos] (

[DispositivoId] int IDENTITY(1,1) NOT NULL,
[Nombre] nvarchar(200) NOT NULL,
[IpAddress] nvarchar(100) NULL,
[Puerto] int DEFAULT ((4370)) NULL,
[ZonaId] int NULL,
[TipoConexion] nvarchar(40) DEFAULT ('SDK') NULL,
[NumeroSerie] nvarchar(200) NULL,
[UltimaSincronizacion] datetime NULL,
[Estado] nvarchar(40) DEFAULT ('Desconectado') NULL,
[Activo] bit DEFAULT ((1)) NULL,
[PasswordCom] nvarchar(40) NULL,
[Firmware] nvarchar(100) NULL,
[Plataforma] nvarchar(100) NULL,
[TotalUsuarios] int DEFAULT ((0)) NULL,
[TotalHuellas] int DEFAULT ((0)) NULL,
[TotalRostros] int DEFAULT ((0)) NULL,
[TotalRegistros] int DEFAULT ((0)) NULL,
[DireccionADMS] nvarchar(200) NULL,
[HoraDispositivo] datetime NULL,
[BorrarChecadas] bit DEFAULT ((0)) NOT NULL,
CONSTRAINT [PK__Disposit__724C27A11D3462C5] PRIMARY KEY CLUSTERED ([DispositivoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[Dispositivos] ADD CONSTRAINT [FK__Dispositi__ZonaI__6908633D] FOREIGN KEY([ZonaId]) REFERENCES [dbo].[Zonas]([ZonaId]);
