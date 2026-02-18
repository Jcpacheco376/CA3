CREATE TABLE [dbo].[UsuariosGruposNomina] (

[UsuarioId] int NOT NULL,
[GrupoNominaId] char(5) NOT NULL,
CONSTRAINT [PK__Usuarios__69225BEC368169AA] PRIMARY KEY CLUSTERED ([UsuarioId] ASC, [GrupoNominaId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[UsuariosGruposNomina] ADD CONSTRAINT [FK__UsuariosG__Usuar__0E391C95] FOREIGN KEY([UsuarioId]) REFERENCES [dbo].[Usuarios]([UsuarioId]);
