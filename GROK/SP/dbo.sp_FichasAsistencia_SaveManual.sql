IF OBJECT_ID('dbo.sp_FichasAsistencia_SaveManual') IS NOT NULL      DROP PROCEDURE dbo.sp_FichasAsistencia_SaveManual;
GO
CREATE   PROCEDURE [dbo].[sp_FichasAsistencia_SaveManual]
    @EmpleadoId INT,
    @Fecha DATE,
    @EstatusManualAbrev NVARCHAR(10) = NULL,
    @Comentarios NVARCHAR(255) = NULL,
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @EstatusId INT = NULL;

    -- 1. VALIDAR ESTATUS (solo si se está asignando uno)
    IF @EstatusManualAbrev IS NOT NULL
    BEGIN
        SELECT @EstatusId = EstatusId 
        FROM dbo.CatalogoEstatusAsistencia 
        WHERE Abreviatura = @EstatusManualAbrev;

        IF @EstatusId IS NULL 
        BEGIN
            RAISERROR('Estatus inválido.', 16, 1);
            RETURN;
        END
    END

    -- 2. VALIDAR QUE NO ESTÉ BLOQUEADO
    IF EXISTS (
        SELECT 1 
        FROM dbo.FichaAsistencia 
        WHERE EmpleadoId = @EmpleadoId 
          AND Fecha = @Fecha 
          AND Estado = 'BLOQUEADO'
    )
    BEGIN
        RAISERROR('El periodo se encuentra CERRADO (Bloqueado).', 16, 1);
        RETURN;
    END

    -- 3. APLICAR CAMBIO (ASIGNAR O DESHACER)
    MERGE dbo.FichaAsistencia AS target
    USING (SELECT @EmpleadoId AS EmpleadoId, @Fecha AS Fecha) AS source
    ON (target.EmpleadoId = source.EmpleadoId AND target.Fecha = source.Fecha)
    
    WHEN MATCHED THEN
        UPDATE SET
            EstatusManualId = @EstatusId,                    -- NULL si es deshacer
            Comentarios = CASE WHEN @EstatusId IS NULL THEN NULL ELSE @Comentarios END,
            ModificadoPorUsuarioId = @UsuarioId,
            FechaModificacion = GETDATE(),
            Estado = CASE WHEN @EstatusId IS NULL THEN 'BORRADOR' ELSE 'VALIDADO' END
    
    WHEN NOT MATCHED THEN
        INSERT (EmpleadoId, Fecha, EstatusManualId, Comentarios, ModificadoPorUsuarioId, FechaModificacion, Estado)
        VALUES (@EmpleadoId, @Fecha, @EstatusId, @Comentarios, @UsuarioId, GETDATE(), 'VALIDADO');

    -- 4. ANÁLISIS AUTOMÁTICO DE INCIDENCIAS (SIEMPRE SE EJECUTA)
    EXEC [dbo].[sp_Incidencias_Analizar]
        @FechaInicio = @Fecha,
        @FechaFin = @Fecha,
        @EmpleadoId = @EmpleadoId,
        @UsuarioId = @UsuarioId,
        @SinRetorno = 1;

    -- 5. RETORNAR ESTADO FINAL (SIEMPRE, para sincronizar frontend)
    SELECT
        f.EmpleadoId,
        f.Fecha,
        f.EstatusManualId,
        f.IncidenciaActivaId,
        f.Estado,
        ea.Abreviatura AS EstatusManualAbrev
    FROM dbo.FichaAsistencia f
    LEFT JOIN dbo.CatalogoEstatusAsistencia ea ON f.EstatusManualId = ea.EstatusId
    WHERE f.EmpleadoId = @EmpleadoId 
      AND f.Fecha = @Fecha;
END
