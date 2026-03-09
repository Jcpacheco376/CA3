-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.51
-- Compilado:           09/03/2026, 09:30:57
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetAllManagement]
    @IncluirInactivos BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        e.EmpleadoId, e.CodRef, e.Pim, 
        e.Nombres, e.ApellidoPaterno, e.ApellidoMaterno, e.NombreCompleto,
        e.FechaNacimiento, e.FechaIngreso, e.Sexo, e.NSS, e.CURP, e.RFC,
        e.DepartamentoId, e.PuestoId, e.HorarioIdPredeterminado,
        e.EstablecimientoId,
        CAST(CASE WHEN e.Imagen IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS TieneFoto, e.Activo,

        -- Relaciones
        d.Nombre AS DepartamentoNombre,
        p.Nombre AS PuestoNombre,
        h.Nombre AS HorarioNombre,
        h.EsRotativo,
        gn.Nombre AS GrupoNominaNombre,
        est.Nombre AS EstablecimientoNombre,

        -- Zonas (JSON)
        (
            SELECT z.Nombre
            FROM EmpleadosZonas ez
            INNER JOIN Zonas z ON ez.ZonaId = z.ZonaId
            WHERE ez.EmpleadoId = e.EmpleadoId
            FOR JSON PATH
        ) AS Zonas,
        
        -- ZonasCount
        (SELECT COUNT(*) FROM EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId) as ZonasCount

    FROM Empleados e
    LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN CatalogoPuestos p ON e.PuestoId = p.PuestoId
    LEFT JOIN CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
    LEFT JOIN CatalogoGruposNomina gn ON e.GrupoNominaId = gn.GrupoNominaId
    LEFT JOIN CatalogoEstablecimientos est ON e.EstablecimientoId = est.EstablecimientoId
    
    WHERE (@IncluirInactivos = 1 OR e.Activo = 1)

    ORDER BY e.NombreCompleto;
END
GO