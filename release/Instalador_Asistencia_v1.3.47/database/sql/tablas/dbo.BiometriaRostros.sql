-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[BiometriaRostros]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='BiometriaRostros' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[BiometriaRostros] (
    [RostroId] int IDENTITY(1,1) NOT NULL,
    [EmpleadoId] int NOT NULL,
    [IndiceRostro] int NOT NULL CONSTRAINT [DF__Biometria__Indic__589CF14A] DEFAULT ((50)),
    [Template] nvarchar(MAX) NOT NULL,
    [Longitud] int NULL,
    [Version] varchar(20) NULL CONSTRAINT [DF__Biometria__Versi__59911583] DEFAULT ('ZKLiveFace'),
    [UltimaActualizacion] datetime NULL CONSTRAINT [DF__Biometria__Ultim__5A8539BC] DEFAULT (getdate()),
    CONSTRAINT [PK_BiometriaRostros] PRIMARY KEY CLUSTERED ([RostroId])
    );
END
GO