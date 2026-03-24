-- ──────────────────────────────────────────────────────────────────────
-- Tabla: [dbo].[RolesPermisos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.16
-- Compilado:           24/03/2026, 16:29:51
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