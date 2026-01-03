IF OBJECT_ID('dbo.sp_Incidencias_Analizar') IS NOT NULL      DROP PROCEDURE dbo.sp_Incidencias_Analizar;
GO
CREATE PROCEDURE [dbo].[sp_Incidencias_Analizar]
    @FechaInicio DATE,
    @FechaFin DATE = NULL,
    @EmpleadoId INT = NULL,
    @UsuarioId INT,
    @SinRetorno BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Ahora DATETIME = GETDATE();
    IF @FechaFin IS NULL SET @FechaFin = @FechaInicio;

    -- ID Falta para comparaciones
    DECLARE @IdFalta INT;
    SELECT TOP 1 @IdFalta = EstatusId
    FROM dbo.CatalogoEstatusAsistencia
    WHERE EsFalta = 1 AND Activo = 1
    ORDER BY EsDefault DESC;

    -------------------------------------------------------------------------
    -- FASE 1: AUTO-RESOLUCIÓN MEJORADA (SIN CAMBIOS)
    -------------------------------------------------------------------------
    DECLARE @AutoResueltas TABLE (IncidenciaId INT, EstatusFinal NVARCHAR(50));

    INSERT INTO @AutoResueltas (IncidenciaId, EstatusFinal)
    SELECT
        i.IncidenciaId,
        ISNULL(cea.Descripcion, 'Sin Estatus')
    FROM dbo.Incidencias i
    JOIN dbo.FichaAsistencia f ON i.IncidenciaId = f.IncidenciaActivaId
    LEFT JOIN dbo.CatalogoEstatusAsistencia cea ON f.EstatusManualId = cea.EstatusId
    WHERE
        f.Fecha BETWEEN @FechaInicio AND @FechaFin
        AND (@EmpleadoId IS NULL OR f.EmpleadoId = @EmpleadoId)
        AND i.Estado NOT IN ('Resuelta', 'Cancelada')
        AND (
            f.EstatusManualId = ISNULL(f.EstatusChecadorId, @IdFalta)
            OR f.EstatusManualId IS NULL
        );

    UPDATE i
    SET Estado = 'Cancelada', FechaCierre = @Ahora, ResueltoPorUsuarioId = @UsuarioId
    FROM dbo.Incidencias i
    JOIN @AutoResueltas ar ON i.IncidenciaId = ar.IncidenciaId;

    INSERT INTO dbo.IncidenciasBitacora (IncidenciaId, UsuarioId, FechaMovimiento, Accion, Comentario, EstadoNuevo)
    SELECT
        IncidenciaId,
        @UsuarioId,
        @Ahora,
        'AutoResolucion',
        'Incidencia corregida (Coincide con checador). Quedó como: ' + EstatusFinal + '.',
        'Cancelada'
    FROM @AutoResueltas;

    UPDATE f
    SET IncidenciaActivaId = NULL
    FROM dbo.FichaAsistencia f
    JOIN @AutoResueltas ar ON f.IncidenciaActivaId = ar.IncidenciaId;

    -------------------------------------------------------------------------
    -- FASE 2: DETECCIÓN (UPSERT + REABRIR POR (EmpleadoId, Fecha))
    --         Selección determinística de UNA regla por día (TOP 1 ORDER BY)
    -------------------------------------------------------------------------
    DECLARE @Candidatas TABLE
    (
        EmpleadoId            INT            NOT NULL,
        Fecha                 DATE           NOT NULL,
        TipoIncidenciaId      INT            NOT NULL,
        EstatusChecadorId     INT            NULL,
        EstatusManualId       INT            NULL,
        NivelSeveridad        VARCHAR(20)    NOT NULL,
        RequiereAutorizacion  BIT            NULL,
        MensajeError          NVARCHAR(255)  NULL,
        PRIMARY KEY (EmpleadoId, Fecha)
    );

    ;WITH F AS
    (
        SELECT
            f.EmpleadoId,
            f.Fecha,
            f.EstatusManualId,
            ISNULL(f.EstatusChecadorId, @IdFalta) AS EstatusSistemaEf
        FROM dbo.FichaAsistencia f
        WHERE
            f.Fecha BETWEEN @FechaInicio AND @FechaFin
            AND (@EmpleadoId IS NULL OR f.EmpleadoId = @EmpleadoId)
            AND f.EstatusManualId IS NOT NULL
    )
    INSERT INTO @Candidatas
    SELECT
        fx.EmpleadoId,
        fx.Fecha,
        ci.TipoIncidenciaId,
        fx.EstatusSistemaEf AS EstatusChecadorId,
        fx.EstatusManualId,
        ci.NivelSeveridad,
        ci.RequiereAutorizacion,
        ci.MensajeError
    FROM F fx
    OUTER APPLY
    (
        SELECT TOP (1) ci.*
        FROM dbo.ConfiguracionIncidencias ci
        WHERE ci.Activo = 1
          AND ci.CodigoRegla = 'CRUCE_ESTATUS'
          AND ci.EstatusSistemaId = fx.EstatusSistemaEf
          AND ci.EstatusManualId = fx.EstatusManualId
        ORDER BY
            CASE ci.NivelSeveridad
                WHEN 'Crítica' THEN 1
                WHEN 'Critica' THEN 1
                WHEN 'Advertencia' THEN 2
                WHEN 'Info' THEN 3
                ELSE 4
            END,
            ci.ConfigId ASC
    ) ci
    WHERE ci.ConfigId IS NOT NULL;

    DECLARE @Insertadas TABLE
    (
        IncidenciaId INT,
        EmpleadoId   INT,
        Fecha        DATE,
        MensajeError NVARCHAR(255) NULL
    );

    DECLARE @Actualizadas TABLE
    (
        IncidenciaId   INT,
        EmpleadoId     INT,
        Fecha          DATE,
        EstadoAnterior VARCHAR(20),
        EstadoNuevo    VARCHAR(20),

        TipoIncidenciaId_Anterior INT,
        TipoIncidenciaId_Nuevo    INT,

        EstatusChecadorId_Anterior INT NULL,
        EstatusChecadorId_Nuevo    INT NULL,

        EstatusManualId_Anterior INT NULL,
        EstatusManualId_Nuevo    INT NULL,

        NivelSeveridad_Anterior VARCHAR(20) NULL,
        NivelSeveridad_Nuevo    VARCHAR(20) NULL,

        RequiereAutorizacion_Anterior BIT NULL,
        RequiereAutorizacion_Nuevo    BIT NULL,

        MensajeError NVARCHAR(255) NULL
    );

    DECLARE @Expediente TABLE
    (
        EmpleadoId   INT NOT NULL,
        Fecha        DATE NOT NULL,
        IncidenciaId INT NOT NULL,
        PRIMARY KEY (EmpleadoId, Fecha)
    );

    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    BEGIN TRAN;

        ---------------------------------------------------------------------
        -- 2.1 INSERT: si NO existe incidencia en ese día, crearla
        ---------------------------------------------------------------------
        INSERT INTO dbo.Incidencias
        (
            EmpleadoId, Fecha, TipoIncidenciaId, EstatusChecadorId, EstatusManualId,
            Estado, NivelSeveridad, RequiereAutorizacion, FechaCreacion
        )
        OUTPUT
            inserted.IncidenciaId,
            inserted.EmpleadoId,
            inserted.Fecha,
            NULL
        INTO @Insertadas (IncidenciaId, EmpleadoId, Fecha, MensajeError)
        SELECT
            c.EmpleadoId,
            c.Fecha,
            c.TipoIncidenciaId,
            c.EstatusChecadorId,
            c.EstatusManualId,
            'Nueva',
            c.NivelSeveridad,
            c.RequiereAutorizacion,
            @Ahora
        FROM @Candidatas c
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM dbo.Incidencias i WITH (UPDLOCK, HOLDLOCK)
            WHERE i.EmpleadoId = c.EmpleadoId
              AND i.Fecha = c.Fecha
        );

        UPDATE ins
        SET ins.MensajeError = c.MensajeError
        FROM @Insertadas ins
        JOIN @Candidatas c
          ON c.EmpleadoId = ins.EmpleadoId
         AND c.Fecha = ins.Fecha;

        ---------------------------------------------------------------------
        -- 2.2 Resolver “expediente” del día: tomar la incidencia MÁS RECIENTE
        ---------------------------------------------------------------------
        INSERT INTO @Expediente (EmpleadoId, Fecha, IncidenciaId)
        SELECT
            c.EmpleadoId,
            c.Fecha,
            x.IncidenciaId
        FROM @Candidatas c
        CROSS APPLY
        (
            SELECT TOP (1) i2.IncidenciaId
            FROM dbo.Incidencias i2 WITH (UPDLOCK, HOLDLOCK)
            WHERE i2.EmpleadoId = c.EmpleadoId
              AND i2.Fecha = c.Fecha
            ORDER BY i2.IncidenciaId DESC
        ) x;

        ---------------------------------------------------------------------
        -- 2.3 UPDATE + REABRIR del expediente
        ---------------------------------------------------------------------
        UPDATE i
        SET
            i.TipoIncidenciaId      = c.TipoIncidenciaId,
            i.EstatusChecadorId     = c.EstatusChecadorId,
            i.EstatusManualId       = c.EstatusManualId,
            i.NivelSeveridad        = c.NivelSeveridad,
            i.RequiereAutorizacion  = c.RequiereAutorizacion,

            i.Estado = CASE
                WHEN i.Estado IN ('Resuelta','Cancelada') THEN 'Nueva'
                ELSE i.Estado
            END,
            i.FechaCierre = CASE
                WHEN i.Estado IN ('Resuelta','Cancelada') THEN NULL
                ELSE i.FechaCierre
            END,
            i.ResueltoPorUsuarioId = CASE
                WHEN i.Estado IN ('Resuelta','Cancelada') THEN NULL
                ELSE i.ResueltoPorUsuarioId
            END
        OUTPUT
            inserted.IncidenciaId,
            inserted.EmpleadoId,
            inserted.Fecha,
            deleted.Estado,
            inserted.Estado,

            deleted.TipoIncidenciaId,
            inserted.TipoIncidenciaId,

            deleted.EstatusChecadorId,
            inserted.EstatusChecadorId,

            deleted.EstatusManualId,
            inserted.EstatusManualId,

            deleted.NivelSeveridad,
            inserted.NivelSeveridad,

            deleted.RequiereAutorizacion,
            inserted.RequiereAutorizacion,

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
        WHERE NOT EXISTS
        (
            SELECT 1
            FROM @Insertadas ins
            WHERE ins.EmpleadoId = e.EmpleadoId
              AND ins.Fecha = e.Fecha
        );

        UPDATE a
        SET a.MensajeError = c.MensajeError
        FROM @Actualizadas a
        JOIN @Candidatas c
          ON c.EmpleadoId = a.EmpleadoId
         AND c.Fecha = a.Fecha;

        ---------------------------------------------------------------------
        -- 2.4 VINCULAR: FichaAsistencia apunta al expediente del día
        ---------------------------------------------------------------------
        UPDATE f
        SET f.IncidenciaActivaId = e.IncidenciaId
        FROM dbo.FichaAsistencia f
        JOIN @Expediente e
          ON e.EmpleadoId = f.EmpleadoId
         AND e.Fecha = f.Fecha
        WHERE
            f.Fecha BETWEEN @FechaInicio AND @FechaFin
            AND (@EmpleadoId IS NULL OR f.EmpleadoId = @EmpleadoId);

        ---------------------------------------------------------------------
        -- 2.5 BITÁCORA: creación
        ---------------------------------------------------------------------
        INSERT INTO dbo.IncidenciasBitacora
            (IncidenciaId, UsuarioId, FechaMovimiento, Accion, Comentario, EstadoNuevo, EstadoAnterior)
        SELECT
            ins.IncidenciaId,
            @UsuarioId,
            @Ahora,
            'CreacionAutomatica',
            ins.MensajeError,
            'Nueva',
            NULL
        FROM @Insertadas ins;

        ---------------------------------------------------------------------
        -- 2.6 BITÁCORA: reapertura (solo cuando realmente reabrió)
        ---------------------------------------------------------------------
        INSERT INTO dbo.IncidenciasBitacora
            (IncidenciaId, UsuarioId, FechaMovimiento, Accion, Comentario, EstadoNuevo, EstadoAnterior)
        SELECT
            a.IncidenciaId,
            @UsuarioId,
            @Ahora,
            'ReaperturaAutomatica',
            ISNULL(a.MensajeError, N'Reabierta automáticamente.'),
            a.EstadoNuevo,
            a.EstadoAnterior
        FROM @Actualizadas a
        WHERE a.EstadoAnterior IN ('Resuelta','Cancelada')
          AND a.EstadoNuevo = 'Nueva';

		-- 2.7 BITÁCORA: cambio de motivo (mensaje corto)
		---------------------------------------------------------------------
		INSERT INTO dbo.IncidenciasBitacora
			(IncidenciaId, UsuarioId, FechaMovimiento, Accion, Comentario, EstadoNuevo, EstadoAnterior)
		SELECT
			a.IncidenciaId,
			@UsuarioId,
			@Ahora,
			'ActualizacionAutomatica',
			LEFT(
				'Motivo actualizado: ' +
				ISNULL(esOld.Descripcion,'(sin estatus)') + ' / ' + ISNULL(emOld.Descripcion,'(sin estatus)') +
				' ? ' +
				ISNULL(esNew.Descripcion,'(sin estatus)') + ' / ' + ISNULL(emNew.Descripcion,'(sin estatus)') +
				CASE
					WHEN ISNULL(a.NivelSeveridad_Anterior,'') <> ISNULL(a.NivelSeveridad_Nuevo,'')
						THEN ' (Sev: ' + ISNULL(a.NivelSeveridad_Anterior,'?') + ' -> ' + ISNULL(a.NivelSeveridad_Nuevo,'?') + ')'
					ELSE ''
				END
			,4000),
			a.EstadoNuevo,
			a.EstadoAnterior
		FROM @Actualizadas a
		LEFT JOIN dbo.CatalogoEstatusAsistencia esOld ON esOld.EstatusId = a.EstatusChecadorId_Anterior
		LEFT JOIN dbo.CatalogoEstatusAsistencia esNew ON esNew.EstatusId = a.EstatusChecadorId_Nuevo
		LEFT JOIN dbo.CatalogoEstatusAsistencia emOld ON emOld.EstatusId = a.EstatusManualId_Anterior
		LEFT JOIN dbo.CatalogoEstatusAsistencia emNew ON emNew.EstatusId = a.EstatusManualId_Nuevo
		WHERE
			a.EstadoAnterior NOT IN ('Resuelta','Cancelada')
			AND a.EstadoNuevo NOT IN ('Resuelta','Cancelada')
			AND (
				a.TipoIncidenciaId_Anterior <> a.TipoIncidenciaId_Nuevo
				OR ISNULL(a.EstatusChecadorId_Anterior,-1) <> ISNULL(a.EstatusChecadorId_Nuevo,-1)
				OR ISNULL(a.EstatusManualId_Anterior,-1)  <> ISNULL(a.EstatusManualId_Nuevo,-1)
				OR ISNULL(a.NivelSeveridad_Anterior,'')   <> ISNULL(a.NivelSeveridad_Nuevo,'')
				OR ISNULL(a.RequiereAutorizacion_Anterior,0) <> ISNULL(a.RequiereAutorizacion_Nuevo,0)
			);


    COMMIT TRAN;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    -------------------------------------------------------------------------
    -- RETORNO
    -------------------------------------------------------------------------
    IF @SinRetorno = 0
    BEGIN
        SELECT
            (SELECT COUNT(*) FROM @AutoResueltas) AS AutoResueltas,
            (SELECT COUNT(*) FROM @Insertadas)   AS NuevasGeneradas,
            (SELECT COUNT(*)
             FROM @Actualizadas
             WHERE EstadoAnterior IN ('Resuelta','Cancelada') AND EstadoNuevo = 'Nueva') AS Reabiertas,
            (SELECT COUNT(*)
             FROM @Actualizadas
             WHERE EstadoAnterior NOT IN ('Resuelta','Cancelada')
               AND EstadoNuevo NOT IN ('Resuelta','Cancelada')
               AND (
                    TipoIncidenciaId_Anterior <> TipoIncidenciaId_Nuevo
                 OR ISNULL(EstatusChecadorId_Anterior,-1) <> ISNULL(EstatusChecadorId_Nuevo,-1)
                 OR ISNULL(EstatusManualId_Anterior,-1)  <> ISNULL(EstatusManualId_Nuevo,-1)
                 OR ISNULL(NivelSeveridad_Anterior,'')   <> ISNULL(NivelSeveridad_Nuevo,'')
                 OR ISNULL(RequiereAutorizacion_Anterior,0) <> ISNULL(RequiereAutorizacion_Nuevo,0)
               )
            ) AS MotivosActualizados;
    END
END

