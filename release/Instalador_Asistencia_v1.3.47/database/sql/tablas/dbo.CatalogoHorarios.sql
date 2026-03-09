-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoHorarios]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoHorarios' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoHorarios] (
    [HorarioId] int IDENTITY(1,1) NOT NULL,
    [CodRef] nvarchar(10) NULL,
    [Abreviatura] nvarchar(10) NOT NULL,
    [Nombre] nvarchar(100) NOT NULL,
    [MinutosTolerancia] int NOT NULL CONSTRAINT [DF__CatalogoH__Minut__1D4655FB] DEFAULT ((0)),
    [ColorUI] nvarchar(50) NOT NULL CONSTRAINT [DF__CatalogoH__Color__1E3A7A34] DEFAULT ('slate'),
    [Activo] bit NOT NULL CONSTRAINT [DF__CatalogoH__Activ__1F2E9E6D] DEFAULT ((1)),
    [EsRotativo] bit NOT NULL CONSTRAINT [DF__CatalogoH__EsRot__58671BC9] DEFAULT ((0)),
    [Turno] char(1) NULL CONSTRAINT [DF__CatalogoH__Turno__60FC61CA] DEFAULT (''),
    CONSTRAINT [PK__Catalogo__BB881B7EFA5F410B] PRIMARY KEY CLUSTERED ([HorarioId])
    );
END
GO