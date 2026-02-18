CREATE TABLE [dbo].[Permisos] (

[PermisoId] int NOT NULL,
[NombrePermiso] nvarchar(400) NULL,
[Descripcion] nvarchar(1020) NULL,
[Activo] bit NULL,
CONSTRAINT [PK_Permisos_Nuevo] PRIMARY KEY CLUSTERED ([PermisoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
