-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[SISPermisos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='SISPermisos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[SISPermisos] (
    [PermisoId] int NOT NULL,
    [NombrePermiso] nvarchar(200) NULL,
    [Descripcion] nvarchar(510) NULL,
    [Activo] bit NULL,
    CONSTRAINT [PK_Permisos_Nuevo] PRIMARY KEY CLUSTERED ([PermisoId])
    );
END
GO