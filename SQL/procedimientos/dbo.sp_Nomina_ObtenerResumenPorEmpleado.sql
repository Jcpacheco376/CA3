IF OBJECT_ID('dbo.sp_Nomina_ObtenerResumenPorEmpleado') IS NOT NULL      DROP PROCEDURE dbo.sp_Nomina_ObtenerResumenPorEmpleado;
GO

CREATE   PROCEDURE [dbo].[sp_Nomina_ObtenerResumenPorEmpleado]
    @GrupoNominaId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @DepartamentoIds NVARCHAR(MAX) = '[]',
    @PuestoIds NVARCHAR(MAX) = '[]',
    @EstablecimientoIds NVARCHAR(MAX) = '[]',
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Deptos TABLE (Id INT);
    DECLARE @Puestos TABLE (Id INT);
    DECLARE @Estabs TABLE (Id INT);

    IF ISJSON(@DepartamentoIds) = 1 AND @DepartamentoIds <> '[]'
        INSERT INTO @Deptos SELECT value FROM OPENJSON(@DepartamentoIds);

    IF ISJSON(@PuestoIds) = 1 AND @PuestoIds <> '[]'
        INSERT INTO @Puestos SELECT value FROM OPENJSON(@PuestoIds);

    IF ISJSON(@EstablecimientoIds) = 1 AND @EstablecimientoIds <> '[]'
        INSERT INTO @Estabs SELECT value FROM OPENJSON(@EstablecimientoIds);

    SELECT
        e.EmpleadoId,
        e.CodRef,
        e.NombreCompleto,
        p.Nombre AS Puesto,
        d.Nombre AS Departamento,
        COUNT(f.FichaId) AS TotalDias,
        SUM(CASE WHEN f.Estado = 'BLOQUEADO' THEN 1 ELSE 0 END) AS DiasBloqueados,
        SUM(CASE WHEN f.Estado = 'VALIDADO'
                 AND f.IncidenciaActivaId IS NULL
                 AND f.EstatusChecadorId IS NOT NULL
                 AND f.EstatusManualId IS NOT NULL
            THEN 1 ELSE 0 END) AS DiasListos,
        SUM(CASE WHEN f.IncidenciaActivaId IS NOT NULL THEN 1 ELSE 0 END) AS DiasConIncidencia,
        SUM(CASE WHEN f.Estado NOT IN ('BLOQUEADO', 'VALIDADO')
                 OR (f.Estado = 'VALIDADO' AND (f.EstatusChecadorId IS NULL OR f.EstatusManualId IS NULL))
            THEN 1 ELSE 0 END) AS DiasPendientes
    FROM [dbo].[Empleados] e
    INNER JOIN [dbo].[FichaAsistencia] f ON e.EmpleadoId = f.EmpleadoId
    LEFT JOIN [dbo].[CatalogoPuestos] p ON e.PuestoId = p.PuestoId
    LEFT JOIN [dbo].[CatalogoDepartamentos] d ON e.DepartamentoId = d.DepartamentoId
    INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
    WHERE e.GrupoNominaId = @GrupoNominaId
      AND f.Fecha BETWEEN @FechaInicio AND @FechaFin
      AND e.Activo = 1
      AND ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
      AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
      AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs))
    GROUP BY e.EmpleadoId, e.CodRef, e.NombreCompleto, p.Nombre, d.Nombre
    ORDER BY e.NombreCompleto;
END

