-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[EventosCalendarioFiltros]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='EventosCalendarioFiltros' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[EventosCalendarioFiltros] (
    [FiltroId] int IDENTITY(1,1) NOT NULL,
    [EventoId] int NOT NULL,
    [Dimension] varchar(20) NOT NULL,
    [ValorId] int NOT NULL,
    [GrupoRegla] int NOT NULL CONSTRAINT [DF__EventosCa__Grupo__0D10B989] DEFAULT ((0)),
    CONSTRAINT [PK_EventosCalendarioFiltros] PRIMARY KEY CLUSTERED ([FiltroId])
    );
END
GO