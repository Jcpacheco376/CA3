-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoNivelesAutorizacion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoNivelesAutorizacion' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoNivelesAutorizacion] (
    [ConfigId] int IDENTITY(1,1) NOT NULL,
    [RoleId] int NOT NULL,
    [NivelSeveridad] varchar(20) NULL,
    CONSTRAINT [PK__Catalogo__C3BC335C69A7C5DE] PRIMARY KEY CLUSTERED ([ConfigId])
    );
END
GO