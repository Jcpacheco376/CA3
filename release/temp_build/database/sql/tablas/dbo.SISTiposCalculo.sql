-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[SISTiposCalculo]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.10
-- Compilado:           07/03/2026, 14:55:41
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SISTiposCalculo' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[SISTiposCalculo] (
    [TipoCalculoId] varchar(20) NOT NULL,
    [Descripcion] varchar(100) NOT NULL,
    [EsSistema] bit NULL CONSTRAINT [DF__SistemaTi__EsSis__47A76F72] DEFAULT ((1)),
    CONSTRAINT [PK_SistemaTiposCalculo] PRIMARY KEY CLUSTERED ([TipoCalculoId])
    );
END
GO