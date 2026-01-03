CREATE TABLE [dbo].[UsuariosDepartamentos] (

[UsuarioId] int NOT NULL,
[DepartamentoId] char(5) NOT NULL,
CONSTRAINT [PK__Usuarios__DD56575B9E26A88A] PRIMARY KEY CLUSTERED ([UsuarioId] ASC, [DepartamentoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[UsuariosDepartamentos] ADD CONSTRAINT [FK__UsuariosD__Usuar__11158940] FOREIGN KEY([UsuarioId]) REFERENCES [dbo].[Usuarios]([UsuarioId]);
