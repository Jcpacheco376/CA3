-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Nomina_EjecutarCierre]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Nomina_EjecutarCierre]
    @GrupoNominaId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @UsuarioId INT,
    @Comentarios NVARCHAR(MAX) = '',
    @DepartamentoIds NVARCHAR(MAX) = '[]',
    @PuestoIds NVARCHAR(MAX) = '[]',
    @EstablecimientoIds NVARCHAR(MAX) = '[]',
    @EmpleadoId INT = NULL 
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
    BEGIN TRY
        BEGIN TRANSACTION;
        -- Actualizar fichas a BLOQUEADO
        UPDATE f
        SET Estado = 'BLOQUEADO',
            FechaModificacion = GETDATE(),
            ModificadoPorUsuarioId = @UsuarioId,
            Comentarios = ISNULL(Comentarios, '') + ' ' + @Comentarios
        FROM [dbo].[FichaAsistencia] f
        INNER JOIN [dbo].[Empleados] e ON f.EmpleadoId = e.EmpleadoId
        INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidosVigentes(@UsuarioId, @FechaInicio, @FechaFin) perm ON e.EmpleadoId = perm.EmpleadoId
        WHERE e.GrupoNominaId = @GrupoNominaId
          AND f.Fecha BETWEEN @FechaInicio AND @FechaFin
          AND f.Estado = 'VALIDADO' -- Solo cerramos las que estén validadas
          -- SI VIENE EMPLEADOID, SOLO AFECTA A ESE; SI NO, APLICA FILTROS MULTIPLES
          AND (@EmpleadoId IS NULL OR e.EmpleadoId = @EmpleadoId)
          AND (@EmpleadoId IS NOT NULL OR (
                ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
            AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
            AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs))
          ));
        DECLARE @Bloqueadas INT = @@ROWCOUNT;
        DECLARE @EstadoFinal VARCHAR(20) = 'COMPLETO';
        -- Registrar en CierresNomina si no existe o actualizar
        IF @EmpleadoId IS NULL AND NOT EXISTS (SELECT 1 FROM [dbo].[CierresNomina] WHERE GrupoNominaId = @GrupoNominaId AND FechaInicio = @FechaInicio AND FechaFin = @FechaFin)
        BEGIN
            INSERT INTO [dbo].[CierresNomina] (GrupoNominaId, FechaInicio, FechaFin, Estado, FechaCierre, UsuarioId, Comentarios)
            VALUES (@GrupoNominaId, @FechaInicio, @FechaFin, @EstadoFinal, GETDATE(), @UsuarioId, @Comentarios);
        END
        ELSE IF @EmpleadoId IS NULL
        BEGIN
            UPDATE [dbo].[CierresNomina]
            SET Estado = @EstadoFinal, FechaCierre = GETDATE(), UsuarioId = @UsuarioId, Comentarios = @Comentarios
            WHERE GrupoNominaId = @GrupoNominaId AND FechaInicio = @FechaInicio AND FechaFin = @FechaFin;
        END
        ELSE IF @EmpleadoId IS NOT NULL -- Cierre individual
        BEGIN
            -- Si no existe un registro global, creamos uno 'PARCIAL'
            IF NOT EXISTS (SELECT 1 FROM [dbo].[CierresNomina] WHERE GrupoNominaId = @GrupoNominaId AND FechaInicio = @FechaInicio AND FechaFin = @FechaFin)
            BEGIN
                INSERT INTO [dbo].[CierresNomina] (GrupoNominaId, FechaInicio, FechaFin, Estado, FechaCierre, UsuarioId, Comentarios)
                VALUES (@GrupoNominaId, @FechaInicio, @FechaFin, 'PARCIAL', GETDATE(), @UsuarioId, 'Cierre individual: EmpleadoId ' + CAST(@EmpleadoId AS VARCHAR));
            END
        END
        COMMIT TRANSACTION;
        SELECT @Bloqueadas AS Bloqueadas;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO