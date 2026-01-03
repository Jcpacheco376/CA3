IF OBJECT_ID('dbo.X_sp_FichasAsistencia_InsertarFuturo') IS NOT NULL      DROP PROCEDURE dbo.X_sp_FichasAsistencia_InsertarFuturo;
GO

-- 3. sp_FichasAsistencia_InsertarFuturo
-- Actualizado: EstatusSupervisor -> EstatusManualId
CREATE   PROCEDURE sp_FichasAsistencia_InsertarFuturo
    @EmpleadoId NVARCHAR(10),
    @Fecha DATE,
    @EstatusSupervisorAbrev NVARCHAR(10),
    @Comentarios NVARCHAR(255),
    @SupervisorId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EstatusId INT;
    DECLARE @DiasFuturoPermitidos INT;

    SELECT 
        @EstatusId = EstatusId,
        @DiasFuturoPermitidos = DiasRegistroFuturo
    FROM dbo.CatalogoEstatusAsistencia WHERE Abreviatura = @EstatusSupervisorAbrev;

    IF @EstatusId IS NULL
    BEGIN
        RAISERROR ('La abreviatura del estatus no es válida.', 16, 1);
        RETURN;
    END

    IF @DiasFuturoPermitidos = 0 OR DATEDIFF(day, GETDATE(), @Fecha) > @DiasFuturoPermitidos
    BEGIN
        RAISERROR ('Este estatus no puede ser asignado con tanta anticipación o no permite registros futuros.', 16, 1);
        RETURN;
    END

    MERGE dbo.FichaAsistencia AS target
    USING (SELECT @EmpleadoId AS EmpleadoId, @Fecha AS Fecha) AS source
    ON (target.EmpleadoId = source.EmpleadoId AND target.Fecha = source.Fecha)
    WHEN MATCHED THEN
        UPDATE SET 
            EstatusManualId = @EstatusId, -- <--- CAMBIO
            Comentarios = @Comentarios,
            ModificadoPorUsuarioId = @SupervisorId,
            FechaModificacion = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (EmpleadoId, Fecha, TipoEntrada, TipoSalida, EstatusManualId, Comentarios, ModificadoPorUsuarioId, FechaModificacion)
        VALUES (@EmpleadoId, @Fecha, 'Manual_Futuro', 'Manual_Futuro', @EstatusId, @Comentarios, @SupervisorId, GETDATE());
END

