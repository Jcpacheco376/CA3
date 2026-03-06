-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[Prenomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.47
-- Compilado:           06/03/2026, 16:41:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='Prenomina' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[Prenomina] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [GrupoNominaId] int NOT NULL,
    [FechaInicio] date NOT NULL,
    [FechaFin] date NOT NULL,
    [UsuarioId] int NULL,
    [EmpleadoId] int NOT NULL,
    [DepartamentoId] int NULL,
    [PuestoId] int NULL,
    [FechaGeneracion] datetime NULL CONSTRAINT [DF__Prenomina__Fecha__55F58EC9] DEFAULT (getdate()),
    CONSTRAINT [PK__Prenomin__3214EC07EFAC178A] PRIMARY KEY CLUSTERED ([Id])
    );
END
GO