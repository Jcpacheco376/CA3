CREATE TABLE [dbo].[PrenominaDetalle] (

[DetalleId] int IDENTITY(1,1) NOT NULL,
[CabeceraId] int NOT NULL,
[Fecha] date NOT NULL,
[ConceptoId] int NOT NULL,
[Valor] decimal(10,2) DEFAULT ((0)) NOT NULL,
CONSTRAINT [PK__Prenomin__6E19D6DAB99DCBC2] PRIMARY KEY CLUSTERED ([DetalleId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[PrenominaDetalle] ADD CONSTRAINT [FK_PrenominaDetalle_Cabecera] FOREIGN KEY([CabeceraId]) REFERENCES [dbo].[Prenomina]([Id]);
