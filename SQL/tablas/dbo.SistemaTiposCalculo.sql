CREATE TABLE [dbo].[SistemaTiposCalculo] (

[TipoCalculoId] varchar(20) NOT NULL,
[Descripcion] varchar(100) NOT NULL,
[EsSistema] bit DEFAULT ((1)) NULL,
CONSTRAINT [PK_SistemaTiposCalculo] PRIMARY KEY CLUSTERED ([TipoCalculoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
