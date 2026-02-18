CREATE TABLE [dbo].[CatalogoConceptosNomina] (

[ConceptoId] int IDENTITY(1,1) NOT NULL,
[Nombre] nvarchar(200) NOT NULL,
[Abreviatura] char(6) NULL,
[CodRef] nvarchar(100) NOT NULL,
[Activo] bit DEFAULT ((1)) NULL,
CONSTRAINT [PK_CatalogoConceptosNomina] PRIMARY KEY CLUSTERED ([ConceptoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ_CatalogoConceptosNomina_CodRef] UNIQUE NONCLUSTERED ([CodRef] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
