CREATE TABLE [dbo].[BiometriaHuellas] (

[HuellaId] int IDENTITY(1,1) NOT NULL,
[EmpleadoId] int NOT NULL,
[DedoIndice] int NOT NULL,
[Template] nvarchar NOT NULL,
[Algoritmo] varchar(20) DEFAULT ('10.0') NULL,
[UltimaActualizacion] datetime DEFAULT (getdate()) NULL,
CONSTRAINT [PK_BiometriaHuellas] PRIMARY KEY CLUSTERED ([HuellaId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[BiometriaHuellas] ADD CONSTRAINT [FK_Huellas_Empleados] FOREIGN KEY([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]);
