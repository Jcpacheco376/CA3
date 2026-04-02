-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[BiometriaHuellas]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='BiometriaHuellas' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[BiometriaHuellas] (
    [HuellaId] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [DedoIndice] int NOT NULL,
    [Template] nvarchar(MAX) NOT NULL,
    [Algoritmo] varchar(20) NULL CONSTRAINT [DF__Biometria__Algor__53D83C2D] DEFAULT ('10.0'),
    [UltimaActualizacion] datetime NULL CONSTRAINT [DF__Biometria__Ultim__54CC6066] DEFAULT (getdate()),
    CONSTRAINT [PK_BiometriaHuellas] PRIMARY KEY CLUSTERED ([HuellaId])
    );
END
GO