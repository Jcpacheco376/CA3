-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CatalogoReglasVacaciones]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CatalogoReglasVacaciones' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CatalogoReglasVacaciones] (
    [ReglaId] int IDENTITY(1,1) NOT NULL,
    [Esquema] varchar(50) NOT NULL,
    [AniosAntiguedad] int NOT NULL,
    [DiasOtorgados] int NOT NULL,
    [FechaVigencia] date NOT NULL CONSTRAINT [DF_CatalogoReglasVacaciones_FechaVigencia] DEFAULT ('1970-01-01'),
    CONSTRAINT [PK_CatalogoReglasVacaciones] PRIMARY KEY CLUSTERED ([ReglaId])
    );
END
GO