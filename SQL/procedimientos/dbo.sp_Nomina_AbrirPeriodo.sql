IF OBJECT_ID('dbo.sp_Nomina_AbrirPeriodo') IS NOT NULL      DROP PROCEDURE dbo.sp_Nomina_AbrirPeriodo;
GO

CREATE   PROCEDURE [dbo].[sp_Nomina_AbrirPeriodo]
    @GrupoNominaId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @UsuarioId INT,
    @Motivo NVARCHAR(510),
    @DepartamentoIds NVARCHAR(MAX) = '[]',
    @PuestoIds NVARCHAR(MAX) = '[]',
    @EstablecimientoIds NVARCHAR(MAX) = '[]'
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
            Comentarios = ISNULL(Comentarios, '') + ' [Desbloqueo: ' + @Motivo + ']'
        FROM [dbo].[FichaAsistencia] f
        INNER JOIN [dbo].[Empleados] e ON f.EmpleadoId = e.EmpleadoId
        INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
        WHERE e.GrupoNominaId = @GrupoNominaId
          AND f.Fecha BETWEEN @FechaInicio AND @FechaFin
          AND f.Estado = 'BLOQUEADO'
          AND ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
          AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
          AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs));

        DECLARE @FilasAfectadas INT = @@ROWCOUNT;

        UPDATE [dbo].[CierresNomina]
        SET Estado = 'ABIERTO',
            Comentarios = ISNULL(Comentarios, '') + ' | REAPERTURA: ' + @Motivo,
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

