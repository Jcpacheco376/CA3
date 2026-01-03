CREATE TABLE [dbo].[CatalogoNivelesAutorizacion] (

[ConfigId] int IDENTITY(1,1) NOT NULL,
[RoleId] int NOT NULL,
[NivelSeveridad] varchar(20) NULL,
CONSTRAINT [PK__Catalogo__C3BC335C69A7C5DE] PRIMARY KEY CLUSTERED ([ConfigId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[CatalogoNivelesAutorizacion] ADD CONSTRAINT [FK_ConfigNivel_Rol] FOREIGN KEY([RoleId]) REFERENCES [dbo].[Roles]([RoleId]);
