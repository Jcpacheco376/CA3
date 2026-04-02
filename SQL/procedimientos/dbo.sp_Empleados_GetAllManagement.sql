-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Empleados_GetAllManagement]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.5.22
-- Compilado:           02/04/2026, 14:20:17
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_Empleados_GetAllManagement]
    @UsuarioId INT = NULL,
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
        CAST(CASE WHEN e.Imagen IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS TieneFoto, e.Activo, e.FechaBaja,
        -- Relaciones
        d.Nombre AS DepartamentoNombre,
        p_cat.Nombre AS PuestoNombre,
        h.Nombre AS HorarioNombre,
        h.EsRotativo,
        gn.Nombre AS GrupoNominaNombre,
        est.Nombre AS EstablecimientoNombre,
        (
            SELECT z.Nombre
            FROM EmpleadosZonas ez
            INNER JOIN Zonas z ON ez.ZonaId = z.ZonaId
            WHERE ez.EmpleadoId = e.EmpleadoId
            FOR JSON PATH
        ) AS Zonas,
        
        (SELECT COUNT(*) FROM EmpleadosZonas ez WHERE ez.EmpleadoId = e.EmpleadoId) as ZonasCount,
        -- Resumen de Vacaciones
        (
            SELECT 
                ISNULL(SUM(vs.DiasOtorgados), 0) as TotalOtorgados,
                ISNULL(SUM(vs.DiasDisfrutados), 0) as TotalConsumidos,
                ISNULL(MAX(CASE WHEN GETDATE() BETWEEN vs.FechaInicioPeriodo AND vs.FechaFinPeriodo THEN vs.DiasOtorgados ELSE 0 END), 0) as OtorgadosActual,
                MAX(CASE WHEN GETDATE() BETWEEN vs.FechaInicioPeriodo AND vs.FechaFinPeriodo THEN vs.FechaInicioPeriodo ELSE NULL END) as IniActual,
                MAX(CASE WHEN GETDATE() BETWEEN vs.FechaInicioPeriodo AND vs.FechaFinPeriodo THEN vs.FechaFinPeriodo ELSE NULL END) as FinActual
            FROM VacacionesSaldos vs
            WHERE vs.EmpleadoId = e.EmpleadoId
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) as VacacionesSummary
    FROM Empleados e
    LEFT JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) p_perm ON e.EmpleadoId = p_perm.EmpleadoId
    LEFT JOIN CatalogoDepartamentos d ON e.DepartamentoId = d.DepartamentoId
    LEFT JOIN CatalogoPuestos p_cat ON e.PuestoId = p_cat.PuestoId
    LEFT JOIN CatalogoHorarios h ON e.HorarioIdPredeterminado = h.HorarioId
    LEFT JOIN CatalogoGruposNomina gn ON e.GrupoNominaId = gn.GrupoNominaId
    LEFT JOIN CatalogoEstablecimientos est ON e.EstablecimientoId = est.EstablecimientoId
    
    WHERE (@IncluirInactivos = 1 OR e.Activo = 1)
      AND (@UsuarioId IS NULL OR p_perm.EmpleadoId IS NOT NULL)
    ORDER BY e.NombreCompleto;
END
GO