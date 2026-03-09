-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoReglasVacaciones]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoReglasVacaciones' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoReglasVacaciones] (
    [ReglaId] int IDENTITY(1,1) NOT NULL,
    [Esquema] varchar(50) NOT NULL,
    [AniosAntiguedad] int NOT NULL,
    [DiasOtorgados] int NOT NULL,
    CONSTRAINT [PK_CatalogoReglasVacaciones] PRIMARY KEY CLUSTERED ([ReglaId])
    );
END
GO