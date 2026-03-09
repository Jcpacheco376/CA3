-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[CierresNomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.66
-- Compilado:           09/03/2026, 15:34:05
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='CierresNomina' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[CierresNomina] (
    [CierreId] int IDENTITY(1,1) NOT NULL,
    [FechaInicio] date NOT NULL,
    [FechaFin] date NOT NULL,
    [FechaCierre] datetime NULL CONSTRAINT [DF__CierresNo__Fecha__5EDF0F2E] DEFAULT (getdate()),
    [UsuarioId] int NOT NULL,
    [Comentarios] nvarchar(255) NULL,
    [Estado] varchar(20) NULL CONSTRAINT [DF__CierresNo__Estad__5FD33367] DEFAULT ('Cerrado'),
    [GrupoNominaId] int NOT NULL CONSTRAINT [DF__CierresNo__Grupo__3C6AC6F0] DEFAULT ((1)),
    CONSTRAINT [PK__CierresN__0BAD3FBAA06FC761] PRIMARY KEY CLUSTERED ([CierreId])
    );
END
GO