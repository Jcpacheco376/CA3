CREATE OR ALTER PROCEDURE [dbo].[sp_EventosCalendario_Upsert]
    @EventoId      INT = NULL,
    @Fecha         DATE,
    @Nombre        NVARCHAR(100),
    @Descripcion   NVARCHAR(500) = NULL,
    @TipoEventoId  VARCHAR(30),
    @AplicaATodos  BIT = 1,
    @Activo        BIT = 1,
    @UsuarioId     INT,
    @FiltrosJSON   NVARCHAR(MAX) = NULL   -- JSON: [{"dimension":"DEPARTAMENTO","valores":[1,3]}, ...]
AS
BEGIN
    SET NOCOUNT ON;

    -- ═══════════════════════════════════════════════════
    -- 1. Validar que el tipo de evento existe y está activo
    -- ═══════════════════════════════════════════════════
    DECLARE @PermiteMultiplesMismoDia BIT, 
            @PermiteMultiplesAnio BIT,
            @esGeneral BIT;

    SELECT @PermiteMultiplesMismoDia = PermiteMultiplesMismoDia,
           @PermiteMultiplesAnio     = PermiteMultiplesAnio,
           @esGeneral = ISNULL(esGeneral, 0)
    FROM dbo.TiposEv|entoCalendario
    WHERE TipoEventoId = @TipoEventoId AND Activo = 1;

    IF @PermiteMultiplesMismoDia IS NULL
    BEGIN
        THROW 50001, 'El tipo de evento especificado no existe o está inactivo.', 1;
    END
    
    -- Si el tipo de evento OBLIGA a aplicar filtros, se ignora lo que mande el cliente
    IF @AplicaFiltros = 1
    BEGIN
        SET @AplicaATodos = 0;
    END

    -- ═══════════════════════════════════════════════════
    -- 2. Validar reglas de duplicidad
    -- ═══════════════════════════════════════════════════

    -- Regla: PermiteMultiplesMismoDia
    IF @PermiteMultiplesMismoDia = 0
    BEGIN
        IF EXISTS (
            SELECT 1 FROM dbo.EventosCalendario
            WHERE Fecha = @Fecha
              AND TipoEventoId = @TipoEventoId
              AND Activo = 1
              AND (@EventoId IS NULL OR EventoId <> @EventoId)
        )
        BEGIN
            THROW 50001, 'Ya existe un evento activo de este tipo para la fecha indicada.', 1;
        END
    END

    -- Regla: PermiteMultiplesAnio
    IF @PermiteMultiplesAnio = 0
    BEGIN
        IF EXISTS (
            SELECT 1 FROM dbo.EventosCalendario
            WHERE YEAR(Fecha) = YEAR(@Fecha)
              AND TipoEventoId = @TipoEventoId
              AND Activo = 1
              AND (@EventoId IS NULL OR EventoId <> @EventoId)
        )
        BEGIN
            THROW 50001, 'Ya existe un evento activo de este tipo para el mismo año.', 1;
        END
    END

    -- ═══════════════════════════════════════════════════
    -- 3. Insert o Update del evento
    -- ═══════════════════════════════════════════════════
    DECLARE @ResultEventoId INT;

    IF @EventoId IS NULL OR @EventoId = 0
    BEGIN
        INSERT INTO dbo.EventosCalendario (Fecha, Nombre, Descripcion, TipoEventoId, AplicaATodos, Activo, CreadoPorUsuarioId)
        VALUES (@Fecha, @Nombre, @Descripcion, @TipoEventoId, @AplicaATodos, @Activo, @UsuarioId);

        SET @ResultEventoId = SCOPE_IDENTITY();
    END
    ELSE
    BEGIN
        UPDATE dbo.EventosCalendario
        SET Fecha         = @Fecha,
            Nombre        = @Nombre,
            Descripcion   = @Descripcion,
            TipoEventoId  = @TipoEventoId,
            AplicaATodos  = @AplicaATodos,
            Activo        = @Activo
        WHERE EventoId = @EventoId;

        SET @ResultEventoId = @EventoId;
    END

    -- ═══════════════════════════════════════════════════
    -- 4. Procesar filtros (borrar y reinsertar)
    -- ═══════════════════════════════════════════════════
    DELETE FROM dbo.EventosCalendarioFiltros WHERE EventoId = @ResultEventoId;

    IF @AplicaATodos = 0 
    BEGIN
        -- Si el tipo de evento fuerza filtros, se usan los del usuario, no los que vienen en el JSON
        IF @AplicaFiltros = 1
        BEGIN
            INSERT INTO dbo.EventosCalendarioFiltros (EventoId, GrupoRegla, Dimension, ValorId)
            SELECT @ResultEventoId, 1, 'DEPARTAMENTO', DepartamentoId FROM dbo.UsuariosDepartamentos WHERE UsuarioId = @UsuarioId
            UNION ALL
            SELECT @ResultEventoId, 1, 'GRUPO_NOMINA', GrupoNominaId FROM dbo.UsuariosGruposNomina WHERE UsuarioId = @UsuarioId
            UNION ALL
            SELECT @ResultEventoId, 1, 'PUESTO', PuestoId FROM dbo.UsuariosPuestos WHERE UsuarioId = @UsuarioId
            UNION ALL
            SELECT @ResultEventoId, 1, 'ESTABLECIMIENTO', EstablecimientoId FROM dbo.UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId;
        END
        ELSE
        BEGIN
            -- Comportamiento original si el tipo de evento no fuerza filtros
            IF @FiltrosJSON IS NOT NULL AND LEN(@FiltrosJSON) > 2
            BEGIN
                INSERT INTO dbo.EventosCalendarioFiltros (EventoId, GrupoRegla, Dimension, ValorId)
                SELECT
                    @ResultEventoId,
                    dimGroup.[grupoRegla],
                    dimGroup.[dimension],
                    valores.[value]
                FROM OPENJSON(@FiltrosJSON)
                WITH (
                    [grupoRegla] INT '$.grupoRegla',
                    [dimension] VARCHAR(20) '$.dimension',
                    [valores]   NVARCHAR(MAX) '$.valores' AS JSON
                ) AS dimGroup
                CROSS APPLY OPENJSON(dimGroup.[valores]) AS valores
                WHERE dimGroup.[dimension] IN ('DEPARTAMENTO', 'GRUPO_NOMINA', 'PUESTO', 'ESTABLECIMIENTO')
                  AND TRY_CAST(valores.[value] AS INT) IS NOT NULL;
            END
        END
    END

    SELECT @ResultEventoId AS EventoId;
END
