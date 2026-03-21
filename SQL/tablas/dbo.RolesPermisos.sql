-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[RolesPermisos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='RolesPermisos' AND schema_id=SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[RolesPermisos] (
    [RoleId] int NULL,
    [PermisoId] int NULL
    );
END
GO