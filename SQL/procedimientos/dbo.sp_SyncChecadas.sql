USE [CA]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_SyncChecadas]
    @FechaInicio DATE = NULL,
    @FechaFin DATE = NULL,
    @Modo VARCHAR(20) = 'BMS_LOCAL' -- 'BMS_LOCAL', 'BMS_REMOTE', 'ZKT_LOCAL', 'ZKT_REMOTE'
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @FI DATETIME = ISNULL(@FechaInicio, CAST(GETDATE() AS DATE));
    DECLARE @FF DATETIME = ISNULL(@FechaFin, CAST(GETDATE() AS DATE));
    -- Ajustar fin del día para @FF
    SET @FF = DATEADD(SECOND, -1, DATEADD(DAY, 1, @FF));

    DECLARE @RowsInserted INT = 0;
    DECLARE @DynamicSQL NVARCHAR(MAX);
    DECLARE @TargetDB NVARCHAR(100);

    -- Obtener Nombre de BD de Entrada desde Configuración
    SELECT TOP 1 @TargetDB = ConfigValue FROM dbo.ConfiguracionSistema WHERE ConfigKey = 'DBENTRADA';
    
    IF @TargetDB IS NULL OR @TargetDB = ''
    BEGIN
        SET @TargetDB = 'BMSJS'; 
        PRINT 'Advertencia: Configuración DBENTRADA no encontrada, usando default: ' + @TargetDB;
    END

    /* ======================================================================
       MODO: BMS_LOCAL
       ====================================================================== */
    IF @Modo = 'BMS_LOCAL'
    BEGIN
        SET @DynamicSQL = N'
        INSERT INTO dbo.Checadas (EmpleadoId, FechaHora, Tipo, Origen, FechaSincronizacion)
        SELECT 
            E.EmpleadoId,
            A.fecha_hora,
            CASE WHEN A.tipo = 0 THEN ''E'' ELSE ''S'' END,
            ''BMS'',
            GETDATE()
        FROM ' + QUOTENAME(@TargetDB) + N'.dbo.asistencia A
        INNER JOIN dbo.Empleados E ON RTRIM(A.empleado) = E.CodRef
        WHERE A.fecha_hora BETWEEN @FI AND @FF
          AND NOT EXISTS (
              SELECT 1 
              FROM dbo.Checadas C 
              WHERE C.EmpleadoId = E.EmpleadoId 
                AND C.FechaHora = A.fecha_hora
          );';

        EXEC sp_executesql @DynamicSQL, N'@FI DATETIME, @FF DATETIME', @FI, @FF;
        SET @RowsInserted = @@ROWCOUNT;
    END

    /* ======================================================================
       MODO: BMS_REMOTE
       ====================================================================== */
    ELSE IF @Modo = 'BMS_REMOTE'
    BEGIN
        -- Usar LinkedServer 'bmsjs' hardcoded o quizas de config si se requiere a futuro.
        -- Por ahora, user solo pidio leer DB name de parametro 'DBENTRADA'.
        DECLARE @LinkedServer NVARCHAR(100) = 'bmsjs'; 
        
        -- Construir query remoto usando @TargetDB
        DECLARE @RemoteQuery NVARCHAR(MAX);
        SET @RemoteQuery = N'SELECT RTRIM(empleado) as CodRefExterno, fecha_hora, tipo 
                             FROM ' + QUOTENAME(@TargetDB) + N'.dbo.asistencia 
                             WHERE fecha_hora BETWEEN ''' + CONVERT(VARCHAR, @FI, 120) + ''' AND ''' + CONVERT(VARCHAR, @FF, 120) + '''';
        
        -- Ejecutar OPENQUERY con SQL dinámico
        SET @DynamicSQL = N'
        INSERT INTO dbo.Checadas (EmpleadoId, FechaHora, Tipo, Origen, FechaSincronizacion)
        SELECT 
            E.EmpleadoId,
            Q.fecha_hora,
            CASE WHEN Q.tipo = 0 THEN ''E'' ELSE ''S'' END,
            ''BMS_REMOTE'',
            GETDATE()
        FROM OPENQUERY(' + QUOTENAME(@LinkedServer) + N', ''' + @RemoteQuery + ''') AS Q
        INNER JOIN dbo.Empleados E ON Q.CodRefExterno = E.CodRef
        WHERE NOT EXISTS (
            SELECT 1 
            FROM dbo.Checadas C 
            WHERE C.EmpleadoId = E.EmpleadoId 
              AND C.FechaHora = Q.fecha_hora
        );';

        -- Nota: Pasar variables dentro de string para OPENQUERY es tricky. 
        -- Arriba convertí fechas a string Y120 para inyectar en @RemoteQuery.
        -- REPLACE ' por '' no es necesario si @RemoteQuery no tiene comillas internas extras.
        
        EXEC sp_executesql @DynamicSQL;
        SET @RowsInserted = @@ROWCOUNT;
    END

    ELSE IF @Modo LIKE 'ZKT_%'
    BEGIN
        PRINT 'Sincronización ZKT no refactorizada.';
    END
    ELSE
    BEGIN
        RAISERROR('Valor de @Modo inválido.', 16, 1);
        RETURN;
    END

    SELECT
        Fuente           = @Modo,
        Insertados       = @RowsInserted,
        FechaInicioUsada = @FI,
        FechaFinUsada    = @FF;
END
