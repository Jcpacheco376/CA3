CREATE TABLE [dbo].[CatalogoEstablecimientos] (

[EstablecimientoId] int IDENTITY(1,1) NOT NULL,
[CodRef] nvarchar(20) NULL,
[Nombre] nvarchar(200) NOT NULL,
[Abreviatura] nvarchar(20) NULL,
[Activo] bit DEFAULT ((1)) NOT NULL,
CONSTRAINT [PK_CatalogoEstablecimientos] PRIMARY KEY CLUSTERED ([EstablecimientoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
