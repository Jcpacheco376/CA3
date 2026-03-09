-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[UsuariosDepartamentos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='UsuariosDepartamentos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[UsuariosDepartamentos] (
    [UsuarioId] int NOT NULL,
    [DepartamentoId] char(5) NOT NULL,
    CONSTRAINT [PK__Usuarios__DD56575B9E26A88A] PRIMARY KEY CLUSTERED ([UsuarioId], [DepartamentoId])
    );
END
GO