CREATE TABLE [dbo].[EventosCalendarioFiltros] (
    [FiltroId]     INT          IDENTITY(1,1) NOT NULL,
    [EventoId]     INT          NOT NULL,
    [GrupoRegla]   INT          NOT NULL DEFAULT 0,  -- Grupo de regla (0, 1, 2...) para OR entre grupos
    [Dimension]    VARCHAR(20)  NOT NULL,  -- DEPARTAMENTO, GRUPO_NOMINA, PUESTO, ESTABLECIMIENTO
    [ValorId]      INT          NOT NULL,
    CONSTRAINT [PK_EventosCalendarioFiltros] PRIMARY KEY CLUSTERED ([FiltroId] ASC),
    CONSTRAINT [FK_EventosFiltros_Evento] FOREIGN KEY ([EventoId])
        REFERENCES [dbo].[EventosCalendario]([EventoId]) ON DELETE CASCADE,
    CONSTRAINT [CK_EventosFiltros_Dimension]
        CHECK ([Dimension] IN ('DEPARTAMENTO', 'GRUPO_NOMINA', 'PUESTO', 'ESTABLECIMIENTO'))
) ON [PRIMARY]
GO

-- Índice para búsqueda rápida por evento
CREATE NONCLUSTERED INDEX [IX_EventosFiltros_EventoId]
    ON [dbo].[EventosCalendarioFiltros]([EventoId])
    INCLUDE ([GrupoRegla], [Dimension], [ValorId]);
GO

-- Evitar duplicados: mismo evento + grupo + dimensión + valor
CREATE UNIQUE NONCLUSTERED INDEX [UQ_EventosFiltros_EventoGrupoDimValor]
    ON [dbo].[EventosCalendarioFiltros]([EventoId], [GrupoRegla], [Dimension], [ValorId]);
GO

-- Migration for existing data:
-- ALTER TABLE dbo.EventosCalendarioFiltros ADD GrupoRegla INT NOT NULL DEFAULT 0;
-- DROP INDEX UQ_EventosFiltros_EventoDimValor ON dbo.EventosCalendarioFiltros;
-- CREATE UNIQUE NONCLUSTERED INDEX UQ_EventosFiltros_EventoGrupoDimValor ON dbo.EventosCalendarioFiltros(EventoId, GrupoRegla, Dimension, ValorId);
GO
