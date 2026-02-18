CREATE TABLE [dbo].[CatalogoEstatusAsistencia] (

[EstatusId] int IDENTITY(1,1) NOT NULL,
[Abreviatura] nvarchar(20) NOT NULL,
[Descripcion] nvarchar(200) NOT NULL,
[ColorUI] nvarchar(100) DEFAULT ('slate') NOT NULL,
[ValorNomina] decimal(3,2) DEFAULT ((0.00)) NOT NULL,
[VisibleSupervisor] bit DEFAULT ((1)) NOT NULL,
[Activo] bit DEFAULT ((1)) NOT NULL,
[DiasRegistroFuturo] int DEFAULT ((0)) NOT NULL,
[PermiteComentario] bit DEFAULT ((0)) NOT NULL,
[TipoCalculoId] varchar(20) NOT NULL,
[CodRef] nvarchar(40) NULL,
[ConceptoNominaId] int NULL,
CONSTRAINT [PK_CatalogoEstatusAsistencia] PRIMARY KEY CLUSTERED ([EstatusId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ_CatalogoEstatusAsistencia_Abreviatura] UNIQUE NONCLUSTERED ([Abreviatura] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[CatalogoEstatusAsistencia] ADD CONSTRAINT [FK_CatalogoEstatus_SistemaTipos] FOREIGN KEY([TipoCalculoId]) REFERENCES [dbo].[SistemaTiposCalculo]([TipoCalculoId]);
