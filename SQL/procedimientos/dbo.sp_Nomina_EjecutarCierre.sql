IF OBJECT_ID('dbo.sp_Nomina_EjecutarCierre') IS NOT NULL      DROP PROCEDURE dbo.sp_Nomina_EjecutarCierre;
GO
CREATE   PROCEDURE [dbo].[sp_Nomina_EjecutarCierre]
    @GrupoNominaId INT,
    @FechaInicio DATE,
    @FechaFin DATE,
    @UsuarioId INT,
    @Comentarios NVARCHAR(510) = NULL,
    @DepartamentoIds NVARCHAR(MAX) = '[]',
    @PuestoIds NVARCHAR(MAX) = '[]',
    @EstablecimientoIds NVARCHAR(MAX) = '[]'
AS
BEGIN
    SET NOCOUNT ON;

    IF @FechaFin > CAST(GETDATE() AS DATE)
    BEGIN
        THROW 51000, 'No es posible cerrar un periodo que aún no ha concluido (Fecha Fin es futura).', 1;
        RETURN;
    END

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
            Estado = 'BLOQUEADO',
            FechaModificacion = GETDATE(),
            ModificadoPorUsuarioId = @UsuarioId
        FROM [dbo].[FichaAsistencia] f
        INNER JOIN [dbo].[Empleados] e ON f.EmpleadoId = e.EmpleadoId
        INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
        WHERE e.GrupoNominaId = @GrupoNominaId
          AND f.Fecha BETWEEN @FechaInicio AND @FechaFin
          AND f.Estado = 'VALIDADO'
          AND f.IncidenciaActivaId IS NULL
          AND f.EstatusChecadorId IS NOT NULL
          AND f.EstatusManualId IS NOT NULL
          AND ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
          AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
          AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs));

        DECLARE @FilasAfectadas INT = @@ROWCOUNT;

        -- Pendientes en el ámbito filtrado + permisos
        DECLARE @Pendientes INT;
        SELECT @Pendientes = COUNT(*)
        FROM [dbo].[FichaAsistencia] f
        INNER JOIN [dbo].[Empleados] e ON f.EmpleadoId = e.EmpleadoId
        INNER JOIN dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId) perm ON e.EmpleadoId = perm.EmpleadoId
        WHERE e.GrupoNominaId = @GrupoNominaId
          AND f.Fecha BETWEEN @FechaInicio AND @FechaFin
          AND f.Estado != 'BLOQUEADO'
          AND ((SELECT COUNT(*) FROM @Deptos) = 0 OR e.DepartamentoId IN (SELECT Id FROM @Deptos))
          AND ((SELECT COUNT(*) FROM @Puestos) = 0 OR e.PuestoId IN (SELECT Id FROM @Puestos))
          AND ((SELECT COUNT(*) FROM @Estabs) = 0 OR e.EstablecimientoId IN (SELECT Id FROM @Estabs));

        DECLARE @EstadoCierre VARCHAR(20) = CASE WHEN @Pendientes = 0 THEN 'COMPLETO' ELSE 'PARCIAL' END;

        -- Registro del cierre (igual que antes)
        MERGE [dbo].[CierresNomina] AS target
        USING (SELECT @GrupoNominaId, @FechaInicio, @FechaFin) AS source (Grupo, Inicio, Fin)
        ON (target.GrupoNominaId = source.Grupo AND target.FechaInicio = source.Inicio AND target.FechaFin = source.Fin)
        WHEN MATCHED THEN
            UPDATE SET FechaCierre = GETDATE(), UsuarioId = @UsuarioId, Estado = @EstadoCierre, Comentarios = @Comentarios
        WHEN NOT MATCHED THEN
            INSERT (FechaInicio, FechaFin, FechaCierre, UsuarioId, Comentarios, Estado, GrupoNominaId)
            VALUES (@FechaInicio, @FechaFin, GETDATE(), @UsuarioId, @Comentarios, @EstadoCierre, @GrupoNominaId);

        COMMIT TRANSACTION;

        SELECT @FilasAfectadas AS FichasBloqueadas, @Pendientes AS FichasPendientes, @EstadoCierre AS EstatusFinal;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END


