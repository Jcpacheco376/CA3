CREATE TABLE [dbo].[BiometriaRostros] (

[Id] int IDENTITY(1,1) NOT NULL,
[EmpleadoId] int NOT NULL,
[IndiceRostro] int DEFAULT ((50)) NULL,
[Template] text NOT NULL,
[Longitud] int NOT NULL,
[Version] varchar(10) DEFAULT ('10.0') NULL,
CONSTRAINT [PK__Biometri__3214EC076014B015] PRIMARY KEY CLUSTERED ([Id] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[BiometriaRostros] ADD CONSTRAINT [FK__Biometria__Emple__02C83540] FOREIGN KEY([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]);
