CREATE TABLE [dbo].[EmpleadosZonas] (

[Id] int IDENTITY(1,1) NOT NULL,
[EmpleadoId] int NOT NULL,
[ZonaId] int NOT NULL,
CONSTRAINT [PK__Empleado__3214EC07C503631F] PRIMARY KEY CLUSTERED ([Id] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[EmpleadosZonas] ADD CONSTRAINT [FK__Empleados__Emple__7D0F5BEA] FOREIGN KEY([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]);
ALTER TABLE [dbo].[EmpleadosZonas] ADD CONSTRAINT [FK__Empleados__ZonaI__7E038023] FOREIGN KEY([ZonaId]) REFERENCES [dbo].[Zonas]([ZonaId]);
