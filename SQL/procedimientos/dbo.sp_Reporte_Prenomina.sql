-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Reporte_Prenomina]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Reporte_Prenomina]
    @FechaInicio DATE,
    @FechaFin DATE,
    @UsuarioId INT,
    @GrupoNominaId INT,
    @Regenerar BIT = 0  -- 1 = forzar regeneracion (borra existente y recalcula), 0 = comportamiento original
AS
BEGIN
    SET NOCOUNT ON;
    -- ========================================================================
    -- 1. Si se solicita regeneracion, borrar el reporte existente de forma segura
    -- ========================================================================
    IF @Regenerar = 1
    BEGIN
        BEGIN TRANSACTION;
        BEGIN TRY
            DELETE FROM PrenominaDetalle 
            WHERE CabeceraId IN (
                SELECT Id 
                FROM Prenomina 
                WHERE GrupoNominaId = @GrupoNominaId 
                  AND FechaInicio = @FechaInicio 
                  AND FechaFin = @FechaFin
            );
            DELETE FROM Prenomina 
            WHERE GrupoNominaId = @GrupoNominaId 
              AND FechaInicio = @FechaInicio 
              AND FechaFin = @FechaFin;
            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
        END CATCH
    END
    -- ========================================================================
    -- 2. Si NO existe el reporte, generar uno nuevo
    -- ========================================================================
    IF NOT EXISTS (SELECT 1 FROM Prenomina WHERE GrupoNominaId = @GrupoNominaId AND FechaInicio = @FechaInicio AND FechaFin = @FechaFin)
    BEGIN
        -- Tabla temporal de cálculo
        CREATE TABLE #CalculoTemp (
            EmpleadoId INT,
            DepartamentoId INT,
            PuestoId INT,
            FechaDia DATE,
            ConceptoId INT,
            ValorDia DECIMAL(10, 2)
        );
        -- Insertar datos calculados
        INSERT INTO #CalculoTemp
        SELECT
            e.EmpleadoId,
            e.DepartamentoId,
            e.PuestoId,
            f.Fecha,
            ea.ConceptoNominaId,
            ISNULL(ea.ValorNomina, 0)
        FROM FichaAsistencia f
        INNER JOIN Empleados e ON f.EmpleadoId = e.EmpleadoId
        INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidosVigentes(@UsuarioId, @FechaInicio, @FechaFin) perm ON e.EmpleadoId = perm.EmpleadoId
        LEFT JOIN CatalogoEstatusAsistencia ea ON f.EstatusManualId = ea.EstatusId
        WHERE f.Fecha BETWEEN @FechaInicio AND @FechaFin
          AND e.GrupoNominaId = @GrupoNominaId
          AND ea.ConceptoNominaId IS NOT NULL;
        -- Transacción de guardado
        BEGIN TRANSACTION;
        BEGIN TRY
            DECLARE @MapaIds TABLE (EmpleadoId INT, NuevoCabeceraId INT);
            -- MERGE para asegurar que TODOS los empleados permitidos y vigentes en el periodo
            -- entren a la Pre-Nómina, incluso si no tuvieron conceptos (para visibilidad)
            MERGE INTO Prenomina AS Target
            USING (
                SELECT DISTINCT e.EmpleadoId, e.DepartamentoId, e.PuestoId
                FROM Empleados e
                INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidosVigentes(@UsuarioId, @FechaInicio, @FechaFin) perm ON e.EmpleadoId = perm.EmpleadoId
                WHERE e.GrupoNominaId = @GrupoNominaId
            ) AS Source ON 1 = 0 
            WHEN NOT MATCHED THEN
                INSERT (GrupoNominaId, FechaInicio, FechaFin, UsuarioID, EmpleadoId, DepartamentoId, PuestoId)
                VALUES (@GrupoNominaId, @FechaInicio, @FechaFin, @UsuarioId, Source.EmpleadoId, Source.DepartamentoId, Source.PuestoId)
            OUTPUT Source.EmpleadoId, Inserted.Id INTO @MapaIds;
            INSERT INTO PrenominaDetalle (CabeceraId, Fecha, ConceptoId, Valor)
            SELECT
                m.NuevoCabeceraId,
                t.FechaDia,
                t.ConceptoId,
                t.ValorDia
            FROM #CalculoTemp t
            INNER JOIN @MapaIds m ON t.EmpleadoId = m.EmpleadoId;
            COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
        END CATCH
        DROP TABLE #CalculoTemp;
    END
    -- ========================================================================
    -- 3. Retornar los datos 
    -- ========================================================================
    SELECT
        p.EmpleadoId,
        e.CodRef AS CodigoEmpleado,
        e.NombreCompleto,
        gn.Nombre AS GrupoNomina,
        d.Nombre AS Departamento, 
        pu.Nombre AS Puesto,       
        e.FechaIngreso AS FechaIngreso,
        (
            SELECT
                det.Fecha,
                c.CodRef AS ConceptoCodigo,      
                c.Nombre AS ConceptoNombre,
				c.Abreviatura AS Abreviatura,
                det.Valor AS CantidadDias
            FROM PrenominaDetalle det
            INNER JOIN CatalogoConceptosNomina c ON det.ConceptoId = c.ConceptoId
            WHERE det.CabeceraId = p.Id
            ORDER BY det.Fecha
            FOR JSON PATH
        ) AS DetalleNomina
    FROM Prenomina p
    INNER JOIN Empleados e ON p.EmpleadoId = e.EmpleadoId
    INNER JOIN CatalogoGruposNomina gn ON p.GrupoNominaId = gn.GrupoNominaId
    LEFT JOIN CatalogoDepartamentos d ON p.DepartamentoId = d.DepartamentoId
    LEFT JOIN CatalogoPuestos pu ON p.PuestoId = pu.PuestoId
    WHERE p.GrupoNominaId = @GrupoNominaId
      AND p.FechaInicio = @FechaInicio
      AND p.FechaFin = @FechaFin
    ORDER BY e.NombreCompleto;
END
GO