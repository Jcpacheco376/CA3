IF OBJECT_ID('dbo.sp_FichasAsistencia_InsertarManual') IS NOT NULL      DROP PROCEDURE dbo.sp_FichasAsistencia_InsertarManual;
GO

-- 3.4. sp_FichasAsistencia_InsertarManual (PARA CASOS EXCEPCIONALES)
CREATE PROCEDURE [dbo].[sp_FichasAsistencia_InsertarManual]
    @EmpleadoId NVARCHAR(10),
    @Fecha DATE,
    @HoraEntrada DATETIME = NULL,
    @HoraSalida DATETIME = NULL,
    @UsuarioRHId INT
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.FichaAsistencia WHERE EmpleadoId = @EmpleadoId AND Fecha = @Fecha)
    BEGIN
        INSERT INTO dbo.FichaAsistencia (EmpleadoId, Fecha, TipoEntrada, TipoSalida)
        VALUES (@EmpleadoId, @Fecha, 'No Registrada', 'No Registrada');
    END

    IF @HoraEntrada IS NOT NULL
    BEGIN
        UPDATE dbo.FichaAsistencia SET HoraEntrada = @HoraEntrada, TipoEntrada = 'Manual_RH', ModificadoPorUsuarioId = @UsuarioRHId, FechaModificacion = GETDATE()
        WHERE EmpleadoId = @EmpleadoId AND Fecha = @Fecha;
    END

    IF @HoraSalida IS NOT NULL
    BEGIN
        UPDATE dbo.FichaAsistencia SET HoraSalida = @HoraSalida, TipoSalida = 'Manual_RH', ModificadoPorUsuarioId = @UsuarioRHId, FechaModificacion = GETDATE()
        WHERE EmpleadoId = @EmpleadoId AND Fecha = @Fecha;
    END
END

