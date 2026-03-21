-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetDatos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetDatos]
                @EmpleadoId INT
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    e.EmpleadoId, e.CodRef, e.Pim,
                    e.Nombres, e.ApellidoPaterno, e.ApellidoMaterno, e.NombreCompleto,
                    e.FechaNacimiento, e.FechaIngreso,
                    e.DepartamentoId, d.Nombre AS departamento_nombre,
                    e.PuestoId, p.Nombre AS puesto_descripcion,
                    e.HorarioIdPredeterminado, h.Nombre AS HorarioNombre,
                    e.GrupoNominaId, gn.Nombre AS grupo_nomina_nombre,
                    e.EstablecimientoId,
                    e.Sexo, e.NSS, e.CURP, e.RFC, e.Activo, e.Imagen,

                    (SELECT Ez.ZonaId, Z.Nombre FROM EmpleadosZonas Ez JOIN Zonas Z ON Ez.ZonaId = Z.ZonaId WHERE Ez.EmpleadoId = e.EmpleadoId FOR JSON PATH) AS Zonas

                FROM Empleados e
                LEFT JOIN CatalogoPuestos p ON e.PuestoId = p.PuestoId
                LEFT JOIN CatalogoGruposNomina gn ON e.GrupoNominaId = gn.GrupoNominaId
                LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
                LEFT JOIN CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
                WHERE e.EmpleadoId = @EmpleadoId;
            END
GO