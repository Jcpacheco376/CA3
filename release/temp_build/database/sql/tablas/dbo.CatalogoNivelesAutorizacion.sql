-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoNivelesAutorizacion]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoNivelesAutorizacion' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoNivelesAutorizacion] (
    [ConfigId] int IDENTITY(1,1) NOT NULL,
    [RoleId] int NOT NULL,
    [NivelSeveridad] varchar(20) NULL,
    PRIMARY KEY CLUSTERED ([ConfigId])
    );
END
GO