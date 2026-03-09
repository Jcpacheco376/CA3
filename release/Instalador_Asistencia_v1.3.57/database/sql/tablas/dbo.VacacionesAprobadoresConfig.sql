-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[VacacionesAprobadoresConfig]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.56
-- Compilado:           09/03/2026, 12:05:29
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='VacacionesAprobadoresConfig' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[VacacionesAprobadoresConfig] (
    [ConfigId] int IDENTITY(1,1) NOT NULL,
    [Orden] int NOT NULL,
    [RolAprobador] varchar(50) NOT NULL,
    [EsObligatorio] bit NULL CONSTRAINT [DF__Vacacione__EsObl__1F2F69C4] DEFAULT ((1)),
    CONSTRAINT [PK_VacacionesAprobadoresConfig] PRIMARY KEY CLUSTERED ([ConfigId])
    );
END
GO