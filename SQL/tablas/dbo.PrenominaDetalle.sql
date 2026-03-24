-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[PrenominaDetalle]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='PrenominaDetalle' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[PrenominaDetalle] (
    [DetalleId] int IDENTITY(1,1) NOT NULL,
    [CabeceraId] int NOT NULL,
    [Fecha] date NOT NULL,
    [ConceptoId] int NOT NULL,
    [Valor] decimal(10, 2) NOT NULL CONSTRAINT [DF__Prenomina__Valor__58D1FB74] DEFAULT ((0)),
    CONSTRAINT [PK__Prenomin__6E19D6DAB99DCBC2] PRIMARY KEY CLUSTERED ([DetalleId])
    );
END
GO