CREATE TABLE [dbo].[Prenomina] (

[Id] int IDENTITY(1,1) NOT NULL,
[GrupoNominaId] int NOT NULL,
[FechaInicio] date NOT NULL,
[FechaFin] date NOT NULL,
[UsuarioId] int NULL,
[EmpleadoId] int NOT NULL,
[DepartamentoId] int NULL,
[PuestoId] int NULL,
[FechaGeneracion] datetime DEFAULT (getdate()) NULL,
CONSTRAINT [PK__Prenomin__3214EC07EFAC178A] PRIMARY KEY CLUSTERED ([Id] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
