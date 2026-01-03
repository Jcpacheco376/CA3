CREATE TABLE [dbo].[Usuarios] (

[UsuarioId] int NOT NULL,
[NombreUsuario] nvarchar(100) NOT NULL,
[PasswordHash] varbinary NOT NULL,
[NombreCompleto] nvarchar(200) NULL,
[Email] nvarchar(200) NULL,
[EstaActivo] bit DEFAULT ((1)) NOT NULL,
[FechaCreacion] datetime DEFAULT (getdate()) NOT NULL,
[Theme] nvarchar(100) NULL,
[AnimationsEnabled] bit DEFAULT ((1)) NOT NULL,
[DebeCambiarPassword] bit DEFAULT ((0)) NOT NULL,
[TokenVersion] int DEFAULT ((1)) NOT NULL,
CONSTRAINT [PK__Usuarios__2B3DE7B818448526] PRIMARY KEY CLUSTERED ([UsuarioId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ__Usuarios__6B0F5AE0D39B3F06] UNIQUE NONCLUSTERED ([NombreUsuario] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
