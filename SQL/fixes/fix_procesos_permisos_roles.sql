-- ============================================================
-- FIX: Asignar procesos.read y procesos.manage al rol Administrador
-- Sistema: CA3 Control de Asistencia
-- Fecha: 15/04/2026
-- ============================================================

-- PASO 0: Matar sesiones bloqueadas (ejecutar primero si el servidor está colgado)
-- Puedes descubrir las sesiones con:
--   SELECT session_id, status, wait_type, wait_time FROM sys.dm_exec_requests WHERE database_id = DB_ID('CA');
-- Y matarlas con:
--   KILL <session_id>;

-- ============================================================
-- PASO 1: Ver roles existentes para confirmar el RolId correcto
-- ============================================================
SELECT RolId, NombreRol FROM SISRoles ORDER BY RolId;

-- ============================================================
-- PASO 2: Ver si los permisos ya están asignados
-- ============================================================
SELECT p.PermisoId, p.NombrePermiso, rp.RolId
FROM SISPermisos p
LEFT JOIN SISRolesPermisos rp ON p.PermisoId = rp.PermisoId
WHERE p.NombrePermiso IN ('procesos.read', 'procesos.manage');

-- ============================================================
-- PASO 3: Asignar permisos al rol Administrador (RolId = 1)
-- Si tu administrador tiene otro RolId, cambia el valor abajo.
-- ============================================================
INSERT INTO SISRolesPermisos (RolId, PermisoId)
SELECT 1, PermisoId
FROM SISPermisos
WHERE NombrePermiso IN ('procesos.read', 'procesos.manage')
  AND NOT EXISTS (
    SELECT 1 FROM SISRolesPermisos rp
    WHERE rp.RolId = 1
      AND rp.PermisoId = SISPermisos.PermisoId
  );

PRINT 'Permisos procesos.read y procesos.manage asignados al rol Administrador (RolId = 1).';

-- ============================================================
-- PASO 4 (Opcional): También asignar a TODOS los roles con acceso admin
-- Descomenta si quieres asignar a un rol específico adicional
-- ============================================================
-- INSERT INTO SISRolesPermisos (RolId, PermisoId)
-- SELECT 2, PermisoId  -- Cambia 2 por el RolId que necesitas
-- FROM SISPermisos
-- WHERE NombrePermiso IN ('procesos.read', 'procesos.manage')
--   AND NOT EXISTS (SELECT 1 FROM SISRolesPermisos rp WHERE rp.RolId = 2 AND rp.PermisoId = SISPermisos.PermisoId);
