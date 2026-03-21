-- ──────────────────────────────────────────────────────────────────────
-- Script: Migración de Datos para Clasificador
-- Sistema: CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- 1. Agregar la columna si no existe (por si no se ha corrido el script de tabla)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.SISPermisos') AND name = 'Clasificador')
BEGIN
    ALTER TABLE dbo.SISPermisos ADD Clasificador nvarchar(50) NULL;
END
GO

-- 2. Poblar Clasificador basado en prefijos de NombrePermiso
UPDATE dbo.SISPermisos SET Clasificador = 'Usuarios' WHERE NombrePermiso LIKE 'usuarios.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Roles' WHERE NombrePermiso LIKE 'roles.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Asistencia' WHERE NombrePermiso LIKE 'reportesAsistencia.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Horarios' WHERE NombrePermiso LIKE 'horarios.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Catalogos' WHERE NombrePermiso LIKE 'catalogo.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Reportes' WHERE NombrePermiso LIKE 'reportes.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Dashboard' WHERE NombrePermiso LIKE 'dashboard.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Nomina' WHERE NombrePermiso LIKE 'nomina.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Dispositivos' WHERE NombrePermiso LIKE 'dispositivos.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Zonas' WHERE NombrePermiso LIKE 'zonas.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Incidencias' WHERE NombrePermiso LIKE 'incidencias.%';
UPDATE dbo.SISPermisos SET Clasificador = 'RRHH' WHERE NombrePermiso LIKE 'vacaciones.%';
UPDATE dbo.SISPermisos SET Clasificador = 'Calendario' WHERE NombrePermiso LIKE 'calendario.%';

-- 3. Marcar permisos básicos como 'Core'
UPDATE dbo.SISPermisos SET Clasificador = 'Core' 
WHERE NombrePermiso IN ('dashboard.read', 'reportesAsistencia.read', 'reportesAsistencia.create', 'reportesAsistencia.update');

-- 4. Otros permisos no definidos
UPDATE dbo.SISPermisos SET Clasificador = 'Otros' WHERE Clasificador IS NULL;
GO
