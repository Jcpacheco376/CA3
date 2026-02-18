CREATE TABLE [dbo].[CierresNomina] (

[CierreId] int IDENTITY(1,1) NOT NULL,
[FechaInicio] date NOT NULL,
[FechaFin] date NOT NULL,
[FechaCierre] datetime DEFAULT (getdate()) NULL,
[UsuarioId] int NOT NULL,
[Comentarios] nvarchar(510) NULL,
[Estado] varchar(20) DEFAULT ('Cerrado') NULL,
[GrupoNominaId] int DEFAULT ((1)) NOT NULL,
CONSTRAINT [PK__CierresN__0BAD3FBAA06FC761] PRIMARY KEY CLUSTERED ([CierreId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[CierresNomina] ADD CONSTRAINT [FK_Cierres_GrupoNomina] FOREIGN KEY([GrupoNominaId]) REFERENCES [dbo].[CatalogoGruposNomina]([GrupoNominaId]);
