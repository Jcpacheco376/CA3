-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetAll]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.13
-- Compilado:           21/03/2026, 14:38:21
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetAll]
                @IncluirInactivos BIT = 0
            AS
            BEGIN
                SET NOCOUNT ON;
                SELECT 
                    e.EmpleadoId, e.CodRef, e.Pim, 
                    e.Nombres, e.ApellidoPaterno, e.ApellidoMaterno, e.NombreCompleto,
                    e.DepartamentoId, e.PuestoId, e.Activo, e.Imagen,
                    e.HorarioIdPredeterminado,
                    
                    d.Nombre AS DepartamentoNombre,
                    p.Nombre AS PuestoNombre,
                    h.Nombre AS HorarioNombre,
                    h.EsRotativo,
                    
                    (
                        SELECT z.Nombre
                        FROM EmpleadosZonas ez
                        INNER JOIN Zonas z ON ez.ZonaId = z.ZonaId
                        WHERE ez.EmpleadoId = e.EmpleadoId
                        FOR JSON PATH
                    ) AS Zonas,
                    
                    (SELECT COUNT(*) FROM EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId) as ZonasCount

                FROM Empleados e
                LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
                LEFT JOIN CatalogoPuestos p ON e.PuestoId = p.PuestoId
                LEFT JOIN CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
                
                WHERE (@IncluirInactivos = 1 OR e.Activo = 1)

                ORDER BY e.NombreCompleto;
            END
GO