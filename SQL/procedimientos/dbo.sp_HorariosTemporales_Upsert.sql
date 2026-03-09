-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_HorariosTemporales_Upsert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.3.58
-- Compilado:           09/03/2026, 14:09:33
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE [dbo].[sp_HorariosTemporales_Upsert]
    @EmpleadoId INT,
    @Fecha DATE,
    @UsuarioId INT,
    @TipoAsignacion CHAR(1),    -- 'H', 'T', 'D' o NULL
    @HorarioId INT = NULL,
    @HorarioDetalleId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET DATEFIRST 1; 

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. VALIDACI�N DE SEGURIDAD (SOLO BLOQUEADO)
        -- Regla inquebrantable: Si ya se pag�/cerr�, no se toca.
        DECLARE @EstadoFicha VARCHAR(20);
        SELECT @EstadoFicha = Estado FROM dbo.FichaAsistencia WHERE EmpleadoId = @EmpleadoId AND Fecha = @Fecha;

        IF @EstadoFicha = 'BLOQUEADO'
        BEGIN
            THROW 51000, 'Periodo BLOQUEADO. No se permiten cambios.', 1;
        END

        -- 2. GUARDADO EN HORARIOS TEMPORALES
        IF @TipoAsignacion IS NULL 
        BEGIN
            DELETE FROM dbo.HorariosTemporales 
			WHERE EmpleadoId = @EmpleadoId AND Fecha = @Fecha;
        END
        ELSE
        BEGIN
            MERGE dbo.HorariosTemporales AS target
            USING (SELECT @EmpleadoId, @Fecha) AS source (EmpleadoId, Fecha)
            ON (target.EmpleadoId = source.EmpleadoId AND target.Fecha = source.Fecha)
            WHEN MATCHED THEN
                UPDATE SET 
                    TipoAsignacion = @TipoAsignacion, 
                    HorarioId = @HorarioId, 
                    HorarioDetalleId = @HorarioDetalleId, 
                    ModificadoPorUsuarioId = @UsuarioId, 
                    FechaModificacion = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (EmpleadoId, Fecha, TipoAsignacion, HorarioId, HorarioDetalleId, ModificadoPorUsuarioId, FechaModificacion)
                VALUES (@EmpleadoId, @Fecha, @TipoAsignacion, @HorarioId, @HorarioDetalleId, @UsuarioId, GETDATE());
        END

        -- 3. PREPARACI�N DE LA FICHA (Reset a BORRADOR)
        -- No calculamos nada. Solo le decimos a la ficha: "Tus datos actuales son viejos, prep�rate para rec�lculo".
        -- Al ponerla en BORRADOR, el procesador (sp_FichasAsistencia_ProcesarChecadas) tendr� permiso para sobrescribirla.
        
        MERGE dbo.FichaAsistencia AS target
        USING (SELECT @EmpleadoId, @Fecha) AS source (EmpleadoId, Fecha)
        ON (target.EmpleadoId = source.EmpleadoId AND target.Fecha = source.Fecha)
        
        WHEN MATCHED AND target.Estado <> 'BLOQUEADO' THEN 
            UPDATE SET 
                Estado = 'BORRADOR', 
                EstatusChecadorId=null,
				EstatusManualId=null,
                HorarioId = NULL, 
                VentanaInicio = NULL,
                VentanaFin = NULL,
				HoraEntrada = NULL,
				HoraSalida = NULL,
                FechaModificacion = GETDATE(),
                ModificadoPorUsuarioId = @UsuarioId
        
        WHEN NOT MATCHED THEN
            INSERT (EmpleadoId, Fecha, Estado, FechaModificacion, ModificadoPorUsuarioId)
            VALUES (@EmpleadoId, @Fecha, 'BORRADOR', GETDATE(), @UsuarioId);
		
		EXEC [dbo].[sp_Incidencias_Analizar] 
				@FechaInicio = @Fecha, 
				@FechaFin = @Fecha, 
				@EmpleadoId = @EmpleadoId, 
				@UsuarioId = @UsuarioId,
				@SinRetorno = 1;

        -- 4. DISPARAR EL C�LCULO REAL
        -- Este SP leer� la tabla HorariosTemporales (que acabamos de actualizar en el paso 2),
        -- calcular� las ventanas exactas y llenar� la ficha correctamente.
		
        EXEC dbo.sp_FichasAsistencia_ProcesarChecadas 
            @EmpleadoId = @EmpleadoId, 
            @FechaInicio = @Fecha, -- Ojo con los nombres de parametros del SP procesador
            @FechaFin = @Fecha,
            @UsuarioId = @UsuarioId;
			

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO