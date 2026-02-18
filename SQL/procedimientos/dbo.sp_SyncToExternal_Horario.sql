IF OBJECT_ID('dbo.sp_SyncToExternal_Horario') IS NOT NULL      DROP PROCEDURE dbo.sp_SyncToExternal_Horario;
GO
CREATE   PROCEDURE [dbo].[sp_SyncToExternal_Horario]
    @HorarioId INT
AS
BEGIN
    SET NOCOUNT ON;

   /* -- 1. Validar conexión al servidor vinculado
    IF NOT EXISTS (SELECT * FROM sys.servers WHERE name = 'bmsjs') 
    BEGIN
        PRINT 'Servidor vinculado [bmsjs] no encontrado. Omitiendo PUSH de Horarios.';
        RETURN;
    END*/

    -- 2. Obtener datos de cabecera local
    DECLARE @CodRef NVARCHAR(50), @Nombre NVARCHAR(100), @MinutosTolerancia INT, 
            @Activo BIT, @Turno CHAR(1), @Status CHAR(1);

    SELECT 
        @CodRef = CodRef,
        @Nombre = Nombre,
        @MinutosTolerancia = MinutosTolerancia,
        @Activo = Activo,
        @Turno = ISNULL(turno, '')
    FROM dbo.CatalogoHorarios 
    WHERE HorarioId = @HorarioId;

    IF @CodRef IS NULL RETURN; -- No existe el horario

    SET @Status = CASE WHEN @Activo = 1 THEN 'V' ELSE 'B' END;

    BEGIN TRY
        -- =========================================================================
        -- PASO A: Sincronizar Cabecera (Tabla: horarios)
        -- =========================================================================
        MERGE INTO [bmsjs].[dbo].[horarios] AS Target
        USING (SELECT @CodRef AS horario, @Nombre AS nombre, @MinutosTolerancia AS tol, @Status AS status, @Turno as turno) AS Source 
        ON RTRIM(Target.horario) = Source.horario
        WHEN MATCHED AND (
            RTRIM(Target.nombre) <> Source.nombre OR 
            Target.minutos_tolerancia <> Source.tol OR 
            Target.status <> Source.status --OR
           -- ISNULL(RTRIM(Target.turno),'') <> Source.turno
        ) THEN
            UPDATE SET 
                Target.nombre = Source.nombre,
                Target.minutos_tolerancia = Source.tol,
                Target.status = Source.status--,
               -- Target.turno = Source.turno
        WHEN NOT MATCHED BY TARGET THEN
            INSERT (horario, nombre, minutos_tolerancia, status)
            VALUES (Source.horario, Source.nombre, Source.tol, Source.status);

        PRINT 'Cabecera de horario sincronizada en BMS.';

	
        -- =========================================================================
        -- PASO B: Sincronizar Detalle (Tabla: mhorarios)
        -- Estrategia: Borrar detalles existentes en BMS para este horario y reinsertar
        -- =========================================================================
        
        DELETE FROM [bmsjs].[dbo].[mhorarios] WHERE RTRIM(horario) = @CodRef;

        INSERT INTO [bmsjs].[dbo].[mhorarios] (
            horario, dia_semana, 
            horas_entrada1, minutos_entrada1,
            horas_salida1, minutos_salida1,
            horas_salida2, minutos_salida2, -- Inicio comida
            horas_entrada2, minutos_entrada2  -- Fin comida
        )
        SELECT 
            @CodRef,
            -- Conversión de Día: Local(1=Lun...7=Dom) -> BMS(1=Dom...7=Sab)
            CASE WHEN DiaSemana = 7 THEN 1 ELSE DiaSemana + 1 END,
            
            -- Descomposición de horas y minutos (BMS usa enteros separados)
            ISNULL(DATEPART(HOUR, HoraEntrada), 0),
            ISNULL(DATEPART(MINUTE, HoraEntrada), 0),
            
            ISNULL(DATEPART(HOUR, HoraSalida), 0),
            ISNULL(DATEPART(MINUTE, HoraSalida), 0),
            
            ISNULL(DATEPART(HOUR, HoraInicioComida), 0),
            ISNULL(DATEPART(MINUTE, HoraInicioComida), 0),
            
            ISNULL(DATEPART(HOUR, HoraFinComida), 0),
            ISNULL(DATEPART(MINUTE, HoraFinComida), 0)
        FROM dbo.CatalogoHorariosDetalle
        WHERE HorarioId = @HorarioId --AND EsDiaLaboral = 1;

        PRINT 'Detalles de horario sincronizados en BMS.';

    END TRY
    BEGIN CATCH
        PRINT 'Error en sp_SyncToExternal_Horario: ' + ERROR_MESSAGE();
        -- No hacemos THROW aquí para no romper la transacción local si BMS falla, 
        -- a menos que sea un requisito estricto que fallen juntos.
    END CATCH
END
