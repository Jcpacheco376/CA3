IF OBJECT_ID('dbo.sp_Incidencias_Analizar') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_Analizar;
GO
CREATE PROCEDURE [dbo].[sp_Incidencias_Analizar]
    @FechaInicio DATE = NULL,
    @FechaFin DATE = NULL,
    @EmpleadoId INT = NULL,
    @UsuarioId INT,
    @SinRetorno BIT = 0,
    @IncidenciaId INT = NULL,
    @OrigenExec NVARCHAR(50) = 'Sistema' -- << NUEVO PARÁMETRO DE CONTROL ('Sistema' o 'Manual')
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 0. PRE-CONFIGURACIÓN
    IF @IncidenciaId IS NOT NULL
    BEGIN
        SELECT @FechaInicio = Fecha, @FechaFin = Fecha, @EmpleadoId = EmpleadoId
        FROM dbo.Incidencias WHERE IncidenciaId = @IncidenciaId;
        IF @EmpleadoId IS NULL RETURN; 
    END
    IF @FechaInicio IS NULL SET @FechaInicio = GETDATE();
    
    DECLARE @Ahora DATETIME = GETDATE();
    IF @FechaFin IS NULL SET @FechaFin = @FechaInicio;

    DECLARE @IdFalta INT;
    SELECT  @IdFalta = EstatusId FROM dbo.CatalogoEstatusAsistencia WHERE TipoCalculoId = 'FALTA' AND Activo = 1;    
    IF @IdFalta IS NULL SET @IdFalta = 1;

    -------------------------------------------------------------------------
    -- FASE 1: AUTO-RESOLUCIÓN
    -------------------------------------------------------------------------
    DECLARE @AutoResueltas TABLE (
        IncidenciaId INT, 
        EstatusFinal NVARCHAR(50),
        Manual_Ant INT, Manual_New INT,
        Checador_Ant INT, Checador_New INT
    );

    INSERT INTO @AutoResueltas (IncidenciaId, EstatusFinal, Manual_Ant, Manual_New, Checador_Ant, Checador_New)
    SELECT
        i.IncidenciaId,
        ISNULL(cea.Descripcion, 'Sin Estatus'),
        i.EstatusManualId, f.EstatusManualId,
        i.EstatusChecadorId, f.EstatusChecadorId
    FROM dbo.Incidencias i
    JOIN dbo.FichaAsistencia f ON i.IncidenciaId = f.IncidenciaActivaId
    LEFT JOIN dbo.CatalogoEstatusAsistencia cea ON f.EstatusManualId = cea.EstatusId
    WHERE
        f.Fecha BETWEEN @FechaInicio AND @FechaFin
        AND (@EmpleadoId IS NULL OR f.EmpleadoId = @EmpleadoId)
        AND (@IncidenciaId IS NULL OR i.IncidenciaId = @IncidenciaId)
        AND i.Estado NOT IN ('Resuelta', 'Cancelada')
        AND (
            f.EstatusManualId = ISNULL(f.EstatusChecadorId, @IdFalta)
            OR f.EstatusManualId IS NULL
            OR NOT EXISTS (
                SELECT 1 FROM dbo.ConfiguracionIncidencias ci
                WHERE ci.Activo = 1 AND ci.CodigoRegla = 'CRUCE_ESTATUS'
                  AND ci.EstatusSistemaId = ISNULL(f.EstatusChecadorId, @IdFalta)
                  AND ci.EstatusManualId = f.EstatusManualId
            )
        );

    -- UPDATE MAESTRO
    UPDATE i
    SET 
        Estado = 'Resuelta', 
        FechaCierre = @Ahora, 
        ResueltoPorUsuarioId = @UsuarioId,
        EstatusManualId = ar.Manual_New,
        EstatusChecadorId = ar.Checador_New
    FROM dbo.Incidencias i
    JOIN @AutoResueltas ar ON i.IncidenciaId = ar.IncidenciaId;

    -- BITÁCORA CON DECISIÓN DE ORIGEN
    INSERT INTO dbo.IncidenciasBitacora (
        IncidenciaId, UsuarioId, FechaMovimiento, Accion, Comentario, EstadoNuevo,
        EstatusManualId_Anterior, EstatusManualId_Nuevo,
        EstatusChecadorId_Anterior, EstatusChecadorId_Nuevo
    )
    SELECT
        IncidenciaId,
        @UsuarioId,
        @Ahora,
        -- LOGICA DE ETIQUETADO PRECISO:
        CASE 
            WHEN @OrigenExec = 'Manual' THEN 'ResolucionManual' -- Forzado por el usuario (Modal/Grid)
            WHEN ISNULL(Checador_Ant, -1) <> ISNULL(Checador_New, -1) THEN 'Sincronizacion' -- Cambió el reloj
            ELSE 'AutoResolucion' -- Cierre por regla de negocio pura
        END,
        'Incidencia resuelta. Estatus final: ' + EstatusFinal,
        'Resuelta',
        Manual_Ant, Manual_New,
        Checador_Ant, Checador_New
    FROM @AutoResueltas;

    UPDATE f SET IncidenciaActivaId = NULL
    FROM dbo.FichaAsistencia f JOIN @AutoResueltas ar ON f.IncidenciaActivaId = ar.IncidenciaId;

    -------------------------------------------------------------------------
    -- FASE 2: DETECCIÓN Y EVOLUCIÓN (Sin cambios)
    -------------------------------------------------------------------------
    DECLARE @Candidatas TABLE (
        EmpleadoId INT NOT NULL, Fecha DATE NOT NULL,
        TipoIncidenciaId INT NOT NULL,
        EstatusChecadorId INT NULL, EstatusManualId INT NULL,
        NivelSeveridad VARCHAR(20) NOT NULL, RequiereAutorizacion BIT NULL,
        MensajeError NVARCHAR(255) NULL,
        PRIMARY KEY (EmpleadoId, Fecha)
    );

    ;WITH F AS (
        SELECT f.EmpleadoId, f.Fecha, f.EstatusManualId, ISNULL(f.EstatusChecadorId, @IdFalta) AS EstatusSistemaEf
        FROM dbo.FichaAsistencia f
        WHERE f.Fecha BETWEEN @FechaInicio AND @FechaFin
          AND (@EmpleadoId IS NULL OR f.EmpleadoId = @EmpleadoId)
          AND f.EstatusManualId IS NOT NULL
    )
    INSERT INTO @Candidatas
    SELECT
        fx.EmpleadoId, fx.Fecha, ci.TipoIncidenciaId, fx.EstatusSistemaEf, fx.EstatusManualId,
        ci.NivelSeveridad, ci.RequiereAutorizacion, ci.MensajeError
    FROM F fx
    OUTER APPLY (
        SELECT TOP (1) ci.* FROM dbo.ConfiguracionIncidencias ci
        WHERE ci.Activo = 1 AND ci.CodigoRegla = 'CRUCE_ESTATUS'
          AND ci.EstatusSistemaId = fx.EstatusSistemaEf AND ci.EstatusManualId = fx.EstatusManualId
        ORDER BY CASE ci.NivelSeveridad WHEN 'Crítica' THEN 1 WHEN 'Advertencia' THEN 2 ELSE 3 END, ci.ConfigId ASC
    ) ci
    WHERE ci.ConfigId IS NOT NULL;

    DECLARE @Insertadas TABLE (IncidenciaId INT, EmpleadoId INT, Fecha DATE, MensajeError NVARCHAR(255));
    
    DECLARE @Actualizadas TABLE (
        IncidenciaId INT, EmpleadoId INT, Fecha DATE,
        EstadoAnterior VARCHAR(20), EstadoNuevo VARCHAR(20),
        TipoIncidenciaId_Anterior INT, TipoIncidenciaId_Nuevo INT,
        EstatusChecadorId_Anterior INT, EstatusChecadorId_Nuevo INT,
        EstatusManualId_Anterior INT, EstatusManualId_Nuevo INT,
        NivelSeveridad_Anterior VARCHAR(20), NivelSeveridad_Nuevo VARCHAR(20),
        RequiereAutorizacion_Anterior BIT, RequiereAutorizacion_Nuevo BIT,
        MensajeError NVARCHAR(255)
    );

    DECLARE @Expediente TABLE (EmpleadoId INT, Fecha DATE, IncidenciaId INT, PRIMARY KEY (EmpleadoId, Fecha));

    BEGIN TRAN;

        -- 2.1 INSERT
        INSERT INTO dbo.Incidencias (EmpleadoId, Fecha, TipoIncidenciaId, EstatusChecadorId, EstatusManualId, Estado, NivelSeveridad, RequiereAutorizacion, FechaCreacion)
        OUTPUT inserted.IncidenciaId, inserted.EmpleadoId, inserted.Fecha, NULL INTO @Insertadas
        SELECT c.EmpleadoId, c.Fecha, c.TipoIncidenciaId, c.EstatusChecadorId, c.EstatusManualId, 'Nueva', c.NivelSeveridad, c.RequiereAutorizacion, @Ahora
        FROM @Candidatas c
        WHERE NOT EXISTS (SELECT 1 FROM dbo.Incidencias i WITH (UPDLOCK, HOLDLOCK) WHERE i.EmpleadoId = c.EmpleadoId AND i.Fecha = c.Fecha);

        UPDATE ins SET ins.MensajeError = c.MensajeError FROM @Insertadas ins JOIN @Candidatas c ON c.EmpleadoId = ins.EmpleadoId AND c.Fecha = ins.Fecha;

        -- 2.2 Resolver Expediente
        INSERT INTO @Expediente (EmpleadoId, Fecha, IncidenciaId)
        SELECT c.EmpleadoId, c.Fecha, x.IncidenciaId FROM @Candidatas c
        CROSS APPLY (SELECT TOP 1 i.IncidenciaId FROM dbo.Incidencias i WITH (UPDLOCK, HOLDLOCK) WHERE i.EmpleadoId = c.EmpleadoId AND i.Fecha = c.Fecha ORDER BY i.IncidenciaId DESC) x;

        -- 2.3 UPDATE + REABRIR
        UPDATE i
        SET
            i.TipoIncidenciaId      = c.TipoIncidenciaId,
            i.EstatusChecadorId     = c.EstatusChecadorId,
            i.EstatusManualId       = c.EstatusManualId,
            i.NivelSeveridad        = c.NivelSeveridad,
            i.RequiereAutorizacion  = c.RequiereAutorizacion,
            i.Estado                = CASE WHEN i.Estado IN ('Resuelta','Cancelada') THEN 'Nueva' ELSE i.Estado END,
            i.FechaCierre           = CASE WHEN i.Estado IN ('Resuelta','Cancelada') THEN NULL ELSE i.FechaCierre END,
            i.ResueltoPorUsuarioId  = CASE WHEN i.Estado IN ('Resuelta','Cancelada') THEN NULL ELSE i.ResueltoPorUsuarioId END
        OUTPUT
            inserted.IncidenciaId, inserted.EmpleadoId, inserted.Fecha,
            deleted.Estado, inserted.Estado,
            deleted.TipoIncidenciaId, inserted.TipoIncidenciaId,
            deleted.EstatusChecadorId, inserted.EstatusChecadorId,
            deleted.EstatusManualId, inserted.EstatusManualId,
            deleted.NivelSeveridad, inserted.NivelSeveridad,
            deleted.RequiereAutorizacion, inserted.RequiereAutorizacion,
            NULL
        INTO @Actualizadas
        (
            IncidenciaId, EmpleadoId, Fecha, EstadoAnterior, EstadoNuevo,
            TipoIncidenciaId_Anterior, TipoIncidenciaId_Nuevo,
            EstatusChecadorId_Anterior, EstatusChecadorId_Nuevo,
            EstatusManualId_Anterior, EstatusManualId_Nuevo,
            NivelSeveridad_Anterior, NivelSeveridad_Nuevo,
            RequiereAutorizacion_Anterior, RequiereAutorizacion_Nuevo,
            MensajeError
        )
        FROM dbo.Incidencias i
        JOIN @Expediente e ON e.IncidenciaId = i.IncidenciaId
        JOIN @Candidatas c ON c.EmpleadoId = e.EmpleadoId AND c.Fecha = e.Fecha
        WHERE 
            NOT EXISTS (SELECT 1 FROM @Insertadas ins WHERE ins.EmpleadoId = e.EmpleadoId AND ins.Fecha = e.Fecha)
            AND (
                i.TipoIncidenciaId <> c.TipoIncidenciaId
                OR ISNULL(i.EstatusChecadorId, -1) <> ISNULL(c.EstatusChecadorId, -1)
                OR ISNULL(i.EstatusManualId, -1)   <> ISNULL(c.EstatusManualId, -1)
                OR i.NivelSeveridad <> c.NivelSeveridad
                OR ISNULL(i.RequiereAutorizacion, 0) <> ISNULL(c.RequiereAutorizacion, 0)
                OR i.Estado IN ('Resuelta', 'Cancelada')
            );

        UPDATE a SET a.MensajeError = c.MensajeError FROM @Actualizadas a JOIN @Candidatas c ON c.EmpleadoId = a.EmpleadoId AND c.Fecha = a.Fecha;

        -- 2.4 VINCULAR
        UPDATE f SET f.IncidenciaActivaId = e.IncidenciaId
        FROM dbo.FichaAsistencia f JOIN @Expediente e ON e.EmpleadoId = f.EmpleadoId AND e.Fecha = f.Fecha
        WHERE f.Fecha BETWEEN @FechaInicio AND @FechaFin AND (@EmpleadoId IS NULL OR f.EmpleadoId = @EmpleadoId);

        -- 2.5 BITÁCORAS
        
        INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, FechaMovimiento, Accion, Comentario, EstadoNuevo)
        SELECT IncidenciaId, @UsuarioId, @Ahora, 'CreacionAutomatica', MensajeError, 'Nueva' FROM @Insertadas;

        INSERT INTO dbo.IncidenciasBitacora (
            IncidenciaId, UsuarioId, FechaMovimiento, Accion, Comentario, EstadoNuevo, EstadoAnterior,
            EstatusManualId_Anterior, EstatusManualId_Nuevo, EstatusChecadorId_Anterior, EstatusChecadorId_Nuevo
        )
        SELECT 
            IncidenciaId, @UsuarioId, @Ahora, 'ReaperturaAutomatica', 
            ISNULL(MensajeError, N'Reabierta automáticamente.'), EstadoNuevo, EstadoAnterior,
            EstatusManualId_Anterior, EstatusManualId_Nuevo, EstatusChecadorId_Anterior, EstatusChecadorId_Nuevo
        FROM @Actualizadas WHERE EstadoAnterior IN ('Resuelta','Cancelada') AND EstadoNuevo = 'Nueva';

        INSERT INTO dbo.IncidenciasBitacora (
            IncidenciaId, UsuarioId, FechaMovimiento, Accion, Comentario, EstadoNuevo, EstadoAnterior,
            EstatusManualId_Anterior, EstatusManualId_Nuevo,
            EstatusChecadorId_Anterior, EstatusChecadorId_Nuevo
        )
        SELECT
            a.IncidenciaId, @UsuarioId, @Ahora, 'EvolucionAutomatica',
            CONCAT(
                CASE WHEN ISNULL(a.EstatusChecadorId_Anterior, -1) <> ISNULL(a.EstatusChecadorId_Nuevo, -1) THEN 'Cambio Sistema: ... ' ELSE '' END,
                CASE WHEN ISNULL(a.EstatusManualId_Anterior, -1) <> ISNULL(a.EstatusManualId_Nuevo, -1) THEN 'Cambio Manual: ... ' ELSE '' END,
                'Datos actualizados.'
            ),
            a.EstadoNuevo, a.EstadoAnterior,
            a.EstatusManualId_Anterior, a.EstatusManualId_Nuevo,
            a.EstatusChecadorId_Anterior, a.EstatusChecadorId_Nuevo
        FROM @Actualizadas a
        WHERE a.EstadoAnterior NOT IN ('Resuelta','Cancelada') 
          AND (
               a.TipoIncidenciaId_Anterior <> a.TipoIncidenciaId_Nuevo 
            OR a.NivelSeveridad_Anterior <> a.NivelSeveridad_Nuevo
            OR ISNULL(a.EstatusManualId_Anterior, -1) <> ISNULL(a.EstatusManualId_Nuevo, -1)
            OR ISNULL(a.EstatusChecadorId_Anterior, -1) <> ISNULL(a.EstatusChecadorId_Nuevo, -1)
          );

    COMMIT TRAN;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    IF @SinRetorno = 0
    BEGIN
        SELECT
            (SELECT COUNT(*) FROM @AutoResueltas) AS AutoResueltas,
            (SELECT COUNT(*) FROM @Insertadas)    AS NuevasGeneradas,
            (SELECT COUNT(*) FROM @Actualizadas WHERE EstadoAnterior IN ('Resuelta','Cancelada') AND EstadoNuevo = 'Nueva') AS Reabiertas,
            (SELECT COUNT(*) FROM @Actualizadas WHERE EstadoAnterior NOT IN ('Resuelta','Cancelada') AND EstadoNuevo NOT IN ('Resuelta','Cancelada')
               AND (TipoIncidenciaId_Anterior <> TipoIncidenciaId_Nuevo OR ISNULL(EstatusChecadorId_Anterior,-1) <> ISNULL(EstatusChecadorId_Nuevo,-1) OR ISNULL(EstatusManualId_Anterior,-1) <> ISNULL(EstatusManualId_Nuevo,-1) OR ISNULL(NivelSeveridad_Anterior,'') <> ISNULL(NivelSeveridad_Nuevo,'') OR ISNULL(RequiereAutorizacion_Anterior,0) <> ISNULL(RequiereAutorizacion_Nuevo,0))) AS MotivosActualizados;
    END
END

