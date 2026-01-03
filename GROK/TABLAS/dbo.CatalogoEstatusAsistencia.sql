CREATE TABLE [dbo].[CatalogoEstatusAsistencia] (

[EstatusId] int IDENTITY(1,1) NOT NULL,
[Abreviatura] nvarchar(20) NOT NULL,
[Descripcion] nvarchar(200) NOT NULL,
[Tipo] nvarchar(100) NOT NULL,
[ColorUI] nvarchar(100) DEFAULT ('slate') NOT NULL,
[ValorNomina] decimal(3,2) DEFAULT ((0.00)) NOT NULL,
[VisibleSupervisor] bit DEFAULT ((1)) NOT NULL,
[Activo] bit DEFAULT ((1)) NOT NULL,
[DiasRegistroFuturo] int DEFAULT ((0)) NOT NULL,
[EsFalta] bit NULL,
[EsRetardo] bit NULL,
[EsEntradaSalidaIncompleta] bit NULL,
[EsAsistencia] bit NULL,
[PermiteComentario] bit DEFAULT ((0)) NOT NULL,
[Esdefault] bit DEFAULT ((0)) NOT NULL,
[EsDescanso] bit DEFAULT ((0)) NOT NULL,
[SinHorario] bit NULL,
CONSTRAINT [PK_CatalogoEstatusAsistencia] PRIMARY KEY CLUSTERED ([EstatusId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ_CatalogoEstatusAsistencia_Abreviatura] UNIQUE NONCLUSTERED ([Abreviatura] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
