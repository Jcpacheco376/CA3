-- Adds the esGeneral column to the TiposEventoCalendario table
-- This column will be used to determine if security filters should be applied when selecting employees for a calendar event.
ALTER TABLE dbo.TiposEventoCalendario
ADD esGeneral BIT NOT NULL DEFAULT 0;
GO
