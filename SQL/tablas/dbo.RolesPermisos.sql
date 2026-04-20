-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[RolesPermisos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.19
-- Compilado:           15/04/2026, 16:13:04
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