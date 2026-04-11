-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_Nomina_AbrirPeriodo]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.12
-- Compilado:           07/04/2026, 11:26:15
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_Nomina_AbrirPeriodo]
    @GrupoNominaId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @UsuarioId INT,
    @Motivo NVARCHAR(510),
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

        UPDATE f
        SET
            Estado = 'VALIDADO',
            FechaModificacion = GETDATE(),
            ModificadoPorUsuarioId = @UsuarioId,
            Comentarios = ISNULL(Comentarios, '') + ' [Desbloqueo individual: ' + @Motivo + ']'
        FROM [dbo].[FichaAsistencia] f
        INNER JOIN [dbo].[Empleados] e ON f.EmpleadoId = e.EmpleadoId
        INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
        WHERE e.GrupoNominaId = @GrupoNominaId
          AND f.Fecha BETWEEN @FechaInicio AND @FechaFin
          AND f.Estado = 'BLOQUEADO'
          -- SI VIENE EMPLEADOID, SOLO AFECTA A ESE; SI NO, APLICA FILTROS MULTIPLES
          AND (@EmpleadoId IS NULL OR e.EmpleadoId = @EmpleadoId)
          AND (@EmpleadoId IS NOT NULL OR (
                ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
            AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
            AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs))
          ));

        DECLARE @FilasAfectadas INT = @@ROWCOUNT;

        -- Actualizar el registro global de cierre si el periodo cambia de estado
        UPDATE [dbo].[CierresNomina]
        SET Estado = 'ABIERTO',
            Comentarios = ISNULL(Comentarios, '') + ' | REAPERTURA: ' + @Motivo + (CASE WHEN @EmpleadoId IS NOT NULL THEN ' (EMP: ' + CAST(@EmpleadoId AS VARCHAR) + ')' ELSE '' END),
            FechaCierre = GETDATE(),
            UsuarioId = @UsuarioId
        WHERE GrupoNominaId = @GrupoNominaId
          AND FechaInicio = @FechaInicio
          AND FechaFin = @FechaFin;

        COMMIT TRANSACTION;

        SELECT @FilasAfectadas AS FichasDesbloqueadas;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO