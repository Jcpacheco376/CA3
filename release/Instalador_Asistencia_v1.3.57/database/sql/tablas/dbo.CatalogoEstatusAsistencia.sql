-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoEstatusAsistencia]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoEstatusAsistencia' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoEstatusAsistencia] (
    [EstatusId] int IDENTITY(1,1) NOT NULL,
    [Abreviatura] nvarchar(10) NOT NULL,
    [Descripcion] nvarchar(100) NOT NULL,
    [ColorUI] nvarchar(50) NOT NULL CONSTRAINT [DF__CatalogoE__Color__39237A9A] DEFAULT ('slate'),
    [ValorNomina] decimal(3, 2) NOT NULL CONSTRAINT [DF__CatalogoE__Valor__3A179ED3] DEFAULT ((0.00)),
    [VisibleSupervisor] bit NOT NULL CONSTRAINT [DF__CatalogoE__Visib__3B0BC30C] DEFAULT ((1)),
    [Activo] bit NOT NULL CONSTRAINT [DF__CatalogoE__Activ__3BFFE745] DEFAULT ((1)),
    [DiasRegistroFuturo] int NOT NULL CONSTRAINT [DF__CatalogoE__DiasR__4589517F] DEFAULT ((0)),
    [PermiteComentario] bit NOT NULL CONSTRAINT [DF__CatalogoE__Permi__477199F1] DEFAULT ((0)),
    [TipoCalculoId] varchar(20) NOT NULL,
    [CodRef] nvarchar(20) NULL,
    [ConceptoNominaId] int NULL,
    CONSTRAINT [PK_CatalogoEstatusAsistencia] PRIMARY KEY CLUSTERED ([EstatusId])
    );
END
GO