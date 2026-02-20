CREATE TABLE [dbo].[BiometriaRostros] (

[RostroId] int IDENTITY(1,1) NOT NULL,
[EmpleadoId] int NOT NULL,
[IndiceRostro] int DEFAULT ((50)) NOT NULL,
[Template] nvarchar NOT NULL,
[Longitud] int NULL,
[Version] varchar(20) DEFAULT ('ZKLiveFace') NULL,
[UltimaActualizacion] datetime DEFAULT (getdate()) NULL,
CONSTRAINT [PK_BiometriaRostros] PRIMARY KEY CLUSTERED ([RostroId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[BiometriaRostros] ADD CONSTRAINT [FK_Rostros_Empleados] FOREIGN KEY([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]);
