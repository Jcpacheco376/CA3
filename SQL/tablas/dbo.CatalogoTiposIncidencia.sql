CREATE TABLE [dbo].[CatalogoTiposIncidencia] (

[TipoIncidenciaId] int IDENTITY(1,1) NOT NULL,
[Nombre] nvarchar(200) NOT NULL,
[Descripcion] nvarchar(510) NULL,
[Activo] bit DEFAULT ((1)) NOT NULL,
[Codigo] varchar(20) NOT NULL,
CONSTRAINT [PK_CatalogoTiposIncidencia] PRIMARY KEY CLUSTERED ([TipoIncidenciaId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ_CatalogoTiposIncidencia_Codigo] UNIQUE NONCLUSTERED ([Codigo] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
