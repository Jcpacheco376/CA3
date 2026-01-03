CREATE TABLE [dbo].[Permisos] (

[PermisoId] int IDENTITY(1,1) NOT NULL,
[NombrePermiso] nvarchar(200) NULL,
[Descripcion] nvarchar(510) NULL,
[Activo] bit DEFAULT ((1)) NULL,
CONSTRAINT [PK__Permisos__96E0C7231F42298A] PRIMARY KEY CLUSTERED ([PermisoId] ASC) WITH (PAD_INDEX = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
