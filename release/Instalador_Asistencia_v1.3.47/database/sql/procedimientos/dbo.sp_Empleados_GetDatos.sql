-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetDatos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.46
-- Compilado:           06/03/2026, 16:18:09
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetDatos]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.44
-- Compilado:           06/03/2026, 15:57:03
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
                    e.DepartamentoId, e.PuestoId, e.HorarioIdPredeterminado,
                    e.GrupoNominaId, e.EstablecimientoId,
                    e.Sexo, e.NSS, e.CURP, e.RFC, e.Activo, e.Imagen,

                    -- return zones IDs as simple list
                    (SELECT Ez.ZonaId FROM EmpleadosZonas Ez WHERE Ez.EmpleadoId = e.EmpleadoId FOR JSON PATH) AS Zonas

                FROM Empleados e
                WHERE e.EmpleadoId = @EmpleadoId;
            END
GO