CREATE TABLE [dbo].[HorariosTemporales] (

[HorarioTemporalId] int IDENTITY(1,1) NOT NULL,
[EmpleadoId] int NOT NULL,
[Fecha] date NOT NULL,
[HorarioId] int NULL,
[ModificadoPorUsuarioId] int NULL,
[FechaModificacion] datetime DEFAULT (getdate()) NULL,
[TipoAsignacion] char(1) DEFAULT ('H') NOT NULL,
[HorarioDetalleId] int NULL,
[EstatusConflictivo] nvarchar(510) NULL,
CONSTRAINT [PK__Horarios__9322C0005E84F59D] PRIMARY KEY CLUSTERED ([HorarioTemporalId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
CONSTRAINT [UQ_Empleado_Fecha_HorarioTemp] UNIQUE NONCLUSTERED ([EmpleadoId] ASC, [Fecha] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
ALTER TABLE [dbo].[HorariosTemporales] ADD CONSTRAINT [FK__HorariosT__Horar__25876198] FOREIGN KEY([HorarioId]) REFERENCES [dbo].[CatalogoHorarios]([HorarioId]);
ALTER TABLE [dbo].[HorariosTemporales] ADD CONSTRAINT [FK__HorariosT__Emple__24933D5F] FOREIGN KEY([EmpleadoId]) REFERENCES [dbo].[Empleados]([EmpleadoId]);
