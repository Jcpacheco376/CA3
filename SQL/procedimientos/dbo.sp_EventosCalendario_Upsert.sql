-- ──────────────────────────────────────────────────────────────────────
-- Stored Procedure: [dbo].[sp_EventosCalendario_Upsert]
-- Base de Datos:       CA
-- Versión de Paquete:  v1.6.14
-- Compilado:           11/04/2026, 13:57:04
-- Sistema:             CA3 Control de Asistencia
-- ──────────────────────────────────────────────────────────────────────

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_EventosCalendario_Upsert]
    @EventoId      INT = NULL,
    @Fecha         DATE,
    @Nombre        NVARCHAR(100),
    @Descripcion   NVARCHAR(500) = NULL,
    @TipoEventoId  VARCHAR(30),
    @AplicaATodos  BIT = 1,
    @Activo        BIT = 1,
    @UsuarioId     INT,
    @Icono         VARCHAR(50) = NULL,
    @FiltrosJSON   NVARCHAR(MAX) = NULL  
AS
BEGIN
    SET NOCOUNT ON;
    -- ═══════════════════════════════════════════════════
    -- 1. Validar que el tipo de evento existe y está activo
    -- ═══════════════════════════════════════════════════
    DECLARE @PermiteMultiplesMismoDia BIT, @PermiteMultiplesAnio BIT;
    SELECT @PermiteMultiplesMismoDia = PermiteMultiplesMismoDia,
           @PermiteMultiplesAnio     = PermiteMultiplesAnio
    FROM dbo.SISTiposEventoCalendario
    WHERE TipoEventoId = @TipoEventoId AND Activo = 1;
    IF @PermiteMultiplesMismoDia IS NULL
    BEGIN
        THROW 50001, 'El tipo de evento especificado no existe o está inactivo.', 1;
    END
    -- ═══════════════════════════════════════════════════
    -- 2. Validar reglas de duplicidad
    -- ═══════════════════════════════════════════════════
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
        INSERT INTO dbo.EventosCalendario (Fecha, Nombre, Descripcion, TipoEventoId, AplicaATodos, Activo, CreadoPorUsuarioId, Icono)
        VALUES (@Fecha, @Nombre, @Descripcion, @TipoEventoId, @AplicaATodos, @Activo, @UsuarioId, @Icono);
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
            Activo        = @Activo,
            Icono         = @Icono
        WHERE EventoId = @EventoId;
        SET @ResultEventoId = @EventoId;
    END
    -- ═══════════════════════════════════════════════════
    -- 4. Procesar filtros (borrar y reinsertar)
    -- ═══════════════════════════════════════════════════
    DELETE FROM dbo.EventosCalendarioFiltros WHERE EventoId = @ResultEventoId;
    IF @AplicaATodos = 0 AND @FiltrosJSON IS NOT NULL AND LEN(@FiltrosJSON) > 2
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
    SELECT @ResultEventoId AS EventoId;
END
GO