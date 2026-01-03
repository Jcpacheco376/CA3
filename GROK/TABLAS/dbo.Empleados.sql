CREATE TABLE [dbo].[Empleados] (

[EmpleadoId] int IDENTITY(1,1) NOT NULL,
[CodRef] nvarchar(20) NOT NULL,
[NombreCompleto] nvarchar(300) NOT NULL,
[FechaNacimiento] date NULL,
[FechaIngreso] date NULL,
[DepartamentoId] int NULL,
[GrupoNominaId] int NULL,
[PuestoId] int NULL,
[HorarioIdPredeterminado] int NULL,
[Activo] bit DEFAULT ((1)) NOT NULL,
[Sexo] nchar(2) NULL,
[NSS] nvarchar(40) NULL,
[CURP] nvarchar(40) NULL,
[RFC] nvarchar(40) NULL,
[Imagen] varbinary NULL,
[EstablecimientoId] int NULL,
[Pim] int NULL,
CONSTRAINT [PK__Empleado__958BE910924FBBD4] PRIMARY KEY CLUSTERED ([EmpleadoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ__Empleado__84823DEF9F934FB5] UNIQUE NONCLUSTERED ([CodRef] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[Empleados] ADD CONSTRAINT [FK__Empleados__Depar__22FF2F51] FOREIGN KEY([DepartamentoId]) REFERENCES [dbo].[CatalogoDepartamentos]([DepartamentoId]);
ALTER TABLE [dbo].[Empleados] ADD CONSTRAINT [FK__Empleados__Grupo__23F3538A] FOREIGN KEY([GrupoNominaId]) REFERENCES [dbo].[CatalogoGruposNomina]([GrupoNominaId]);
ALTER TABLE [dbo].[Empleados] ADD CONSTRAINT [FK__Empleados__Puest__24E777C3] FOREIGN KEY([PuestoId]) REFERENCES [dbo].[CatalogoPuestos]([PuestoId]);
ALTER TABLE [dbo].[Empleados] ADD CONSTRAINT [FK__Empleados__Horar__25DB9BFC] FOREIGN KEY([HorarioIdPredeterminado]) REFERENCES [dbo].[CatalogoHorarios]([HorarioId]);
