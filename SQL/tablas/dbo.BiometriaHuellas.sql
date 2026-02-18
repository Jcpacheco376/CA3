CREATE TABLE [dbo].[BiometriaHuellas] (

[HuellaId] int IDENTITY(1,1) NOT NULL,
[UsuarioId] int NOT NULL,
[DedoIndice] int NOT NULL,
[TemplateHuella] nvarchar NOT NULL,
[AlgoritmoVersion] nvarchar(40) DEFAULT ('10.0') NULL,
[FechaRegistro] datetime DEFAULT (getdate()) NULL,
CONSTRAINT [PK__Biometri__D76A662A22A536FB] PRIMARY KEY CLUSTERED ([HuellaId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[BiometriaHuellas] ADD CONSTRAINT [FK_Biometria_Usuario] FOREIGN KEY([UsuarioId]) REFERENCES [dbo].[Usuarios]([UsuarioId]);
