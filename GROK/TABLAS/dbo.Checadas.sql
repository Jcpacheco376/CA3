CREATE TABLE [dbo].[Checadas] (

[ChecadaId] bigint IDENTITY(-2000000000,1) NOT NULL,
[EmpleadoId] int NOT NULL,
[FechaHora] datetime NOT NULL,
[Checador] nvarchar(200) NULL,
CONSTRAINT [PK__Checadas__E09D0857F5FF0142] PRIMARY KEY CLUSTERED ([ChecadaId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[Checadas] ADD CONSTRAINT [FK_Checadas_Empleado] FOREIGN KEY([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]);
