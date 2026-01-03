IF OBJECT_ID('dbo.sp_SyncChecadas') IS NOT NULL      DROP PROCEDURE dbo.sp_SyncChecadas;
GO
CREATE  PROCEDURE [dbo].[sp_SyncChecadas]
(
    @FechaInicio      DATE          = NULL,   -- si NULL => hoy - 7 días
    @FechaFin         DATE          = NULL,   -- si NULL => hoy
    @EmpleadoCodRef   NVARCHAR(20)  = NULL,    -- opcional (BMS: empleado / ZKT: emp_pin)
	@LinkedServer	  NVARCHAR(300) = NULL,
	@Modo			  NVARCHAR(20)
)
AS
BEGIN
    SET NOCOUNT ON;

    /* === AJUSTA AQUÍ EL ORIGEN === */
    -- Opciones: 'BMS_LOCAL', 'BMS_REMOTE', 'ZKT_LOCAL', 'ZKT_REMOTE'
    --DECLARE @Modo NVARCHAR(20) = N'ZKT_LOCAL';  
    
    -- Servidor vinculado (solo se usa para los modos 'REMOTE')
 --  DECLARE @LinkedServer NVARCHAR(300) = N'[192.168.0.141,9000]'; 

    /* Fechas efectivas */
    DECLARE @FI DATE = ISNULL(@FechaInicio, CONVERT(date, DATEADD(DAY, -7, GETDATE())));
    DECLARE @FF DATE = ISNULL(@FechaFin,    CONVERT(date, GETDATE()));
    -- Rango semiabierto: [FI, FF+1d)
    DECLARE @FF_NEXTDAY DATETIME = DATEADD(DAY, 1, CAST(@FF AS DATETIME)); 
    
    DECLARE @RowsInserted INT = 0;

    /* ==================================================================
       MODOS LOCALES (Consultas directas)
       ================================================================== */

    -- MODO 1: BMS LOCAL
    IF @Modo = 'BMS_LOCAL'
    BEGIN
        PRINT 'Modo LOCAL: Sincronizando desde bmsjs...';
        
        INSERT INTO dbo.Checadas(EmpleadoId, FechaHora,  Checador)
        SELECT 
            E.EmpleadoId,               -- ID Local Traducido
            S.fecha AS FechaHora,
            S.equipo_BMS AS Checador
        FROM bmsjs.dbo.entradas_salidas_empleados AS S WITH (NOLOCK)
        -- JOIN PARA TRADUCIR CODREF A ID LOCAL
        INNER JOIN dbo.Empleados E ON RTRIM(S.empleado) = E.CodRef
        WHERE 
            S.fecha >= @FI AND S.fecha < @FF_NEXTDAY
            AND (@EmpleadoCodRef IS NULL OR S.empleado = @EmpleadoCodRef)
            AND NOT EXISTS (
                SELECT 1 FROM dbo.Checadas C WITH (NOLOCK)
                WHERE C.EmpleadoId = E.EmpleadoId -- Comparación rápida por ID
                  AND C.FechaHora  = S.fecha
            );
        
        SET @RowsInserted = @@ROWCOUNT;
    END

    -- MODO 2: ZKT LOCAL
    ELSE IF @Modo = 'ZKT_LOCAL'
    BEGIN
        PRINT 'Modo LOCAL: Sincronizando desde ZKTimeNet...';
        
        INSERT INTO dbo.Checadas(EmpleadoId, FechaHora,  Checador)
        SELECT 
            EmpLocal.EmpleadoId,        -- ID Local Traducido
            a.punch_time AS FechaHora,
            t.terminal_name AS Checador
        FROM ZKTimeNet.dbo.att_punches a WITH (NOLOCK)
        JOIN ZKTimeNet.dbo.hr_employee e WITH (NOLOCK) ON a.employee_id = e.id
        JOIN ZKTimeNet.dbo.att_terminal t WITH (NOLOCK) ON a.terminal_id = t.id
        -- JOIN PARA TRADUCIR CODREF A ID LOCAL
        INNER JOIN dbo.Empleados EmpLocal ON RTRIM(e.emp_pin) = EmpLocal.CodRef
        WHERE 
            a.punch_time >= @FI AND a.punch_time < @FF_NEXTDAY
            AND (@EmpleadoCodRef IS NULL OR e.emp_pin = @EmpleadoCodRef)
            AND NOT EXISTS (
                SELECT 1 FROM dbo.Checadas C WITH (NOLOCK)
                WHERE C.EmpleadoId = EmpLocal.EmpleadoId -- Comparación rápida por ID
                  AND C.FechaHora  = a.punch_time
            );
        
        SET @RowsInserted = @@ROWCOUNT;
    END
	-- MODO 2.5: ZKT SQLITE (Linked Server a SQLite con OPENQUERY)
    ELSE IF @Modo = 'ZKT_SQLITE'
    BEGIN
        PRINT 'Modo SQLITE: Sincronizando desde ZKTimeNet (SQLite)...';

        DECLARE @FI_ISO  NVARCHAR(23) = CONVERT(NVARCHAR(23), CAST(@FI AS DATETIME), 121);
        DECLARE @FF_ISO  NVARCHAR(23) = CONVERT(NVARCHAR(23), @FF_NEXTDAY, 121);

        DECLARE @SqlSQLite NVARCHAR(MAX) = N'
            SELECT 
                RTRIM(e.emp_pin)      AS CodRefExterno,
                a.punch_time          AS FechaHora,
                t.terminal_name       AS Checador
            FROM att_punches a
            JOIN hr_employee  e ON a.emp_id = e.id
            JOIN att_terminal t ON a.terminal_id = t.id
            WHERE a.punch_time >= ''' + @FI_ISO + N'''
              AND a.punch_time <  ''' + @FF_ISO + N'''';

        IF @EmpleadoCodRef IS NOT NULL
            SET @SqlSQLite += N' AND e.emp_pin = ''' + REPLACE(@EmpleadoCodRef, '''', '''''') + N'''';

        DECLARE @SqlFinal NVARCHAR(MAX) = N'
            INSERT INTO dbo.Checadas(EmpleadoId, FechaHora, Checador)
            SELECT 
                E.EmpleadoId,
                S.FechaHora,
                S.Checador
            FROM OPENQUERY(ZKTIME, ''' + REPLACE(@SqlSQLite, '''', '''''') + N''') S
            INNER JOIN dbo.Empleados E ON S.CodRefExterno = E.Pim
            WHERE NOT EXISTS (
                SELECT 1 
                FROM dbo.Checadas C WITH (NOLOCK)
                WHERE C.EmpleadoId = E.EmpleadoId
                  AND C.FechaHora  = S.FechaHora
            );';

        EXEC sys.sp_executesql @SqlFinal;

        SET @RowsInserted = @@ROWCOUNT;
    END
    /* ==================================================================
       MODOS REMOTOS (OPENQUERY con SQL Dinámico)
       ================================================================== */

    -- MODO 3 y 4: BMS_REMOTE o ZKT_REMOTE
    ELSE IF @Modo = 'BMS_REMOTE' OR @Modo = 'ZKT_REMOTE'
    BEGIN
        PRINT 'Modo REMOTO: Preparando consulta para ' + @Modo;
        
        -- Variables para SQL dinámico
        DECLARE @remoteSql  NVARCHAR(MAX);
        DECLARE @EmpFilter  NVARCHAR(200) = N'';
        DECLARE @FI_ISO2     NVARCHAR(23) = CONVERT(NVARCHAR(23), CAST(@FI AS DATETIME), 121);
        DECLARE @FF_ISO2     NVARCHAR(23) = CONVERT(NVARCHAR(23), @FF_NEXTDAY, 121);

        -- Construir la consulta remota específica
        IF @Modo = 'BMS_REMOTE'
        BEGIN
            IF @EmpleadoCodRef IS NOT NULL
                SET @EmpFilter = N' AND empleado = ''' + REPLACE(@EmpleadoCodRef, '''', '''''') + N''' ';

            SET @remoteSql = 
                N'SELECT ' +
                N' RTRIM(empleado) AS CodRefExterno,' + 
                N' fecha           AS FechaHora,' +
                N' equipo_BMS      AS Checador ' +
                N'FROM bmsjs.dbo.entradas_salidas_empleados WITH (NOLOCK) ' +
                N'WHERE fecha >= ''' + @FI_ISO2 + N''' AND fecha < ''' + @FF_ISO2 + N''' ' +
                @EmpFilter + N';';
        END
        ELSE -- @Modo = 'ZKT_REMOTE'
        BEGIN
            IF @EmpleadoCodRef IS NOT NULL
                SET @EmpFilter = N' AND e.emp_pin = ''' + REPLACE(@EmpleadoCodRef, '''', '''''') + N''' ';

            SET @remoteSql = 
                N'SELECT ' +
                N' RTRIM(e.emp_pin)   AS CodRefExterno,' + 
                N' a.punch_time       AS FechaHora,' +
                N' t.terminal_name    AS Checador ' +
                N'FROM ZKTimeNet.dbo.att_punches a WITH (NOLOCK) ' +
                N'JOIN ZKTimeNet.dbo.hr_employee e  WITH (NOLOCK) ON a.employee_id = e.id ' +
                N'JOIN ZKTimeNet.dbo.att_terminal t WITH (NOLOCK) ON a.terminal_id = t.id ' +
                N'WHERE a.punch_time >= ''' + @FI_ISO2 + N''' AND a.punch_time < ''' + @FF_ISO2 + N''' ' +
                @EmpFilter + N';';
        END

        -- Ejecución del comando OPENQUERY con TRADUCCIÓN LOCAL
        DECLARE @remoteSqlEsc NVARCHAR(MAX) = REPLACE(@remoteSql, '''', '''''');
        
        -- Nota: 'RemoteSync' es un origen genérico para diferenciar
        DECLARE @cmd NVARCHAR(MAX) = N'
            INSERT INTO dbo.Checadas(EmpleadoId, FechaHora, Checador)
            SELECT 
                E.EmpleadoId,      
                S.FechaHora, 
                S.Checador
            FROM OPENQUERY(' + @LinkedServer + N', ''' + @remoteSqlEsc + N''') AS S
            INNER JOIN dbo.Empleados E ON S.CodRefExterno = E.CodRef
            WHERE NOT EXISTS (
                SELECT 1
                FROM dbo.Checadas C WITH (NOLOCK)
         WHERE C.EmpleadoId = E.EmpleadoId
                  AND C.FechaHora  = S.FechaHora            
            );';
        
        EXEC sys.sp_executesql @cmd;
        SET @RowsInserted = @@ROWCOUNT;
    END
    
    /* ==================================================================
       ERROR
       ================================================================== */
    ELSE
    BEGIN
        RAISERROR('Valor de @Modo inválido. Use ''BMS_LOCAL'', ''BMS_REMOTE'', ''ZKT_LOCAL'' o ''ZKT_REMOTE''.', 16, 1);
        RETURN;
    END

    /* Resultado */
    SELECT 
        Fuente           = @Modo,
        Insertados       = @RowsInserted,
        FechaInicioUsada = @FI,
        FechaFinUsada    = @FF;
END




