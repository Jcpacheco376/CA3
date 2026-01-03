CREATE TABLE [dbo].[UsuariosEstablecimientos] (

[UsuarioId] int NOT NULL,
[EstablecimientoId] int NOT NULL,
CONSTRAINT [PK_UsuariosEstablecimientos] PRIMARY KEY CLUSTERED ([UsuarioId] ASC, [EstablecimientoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
