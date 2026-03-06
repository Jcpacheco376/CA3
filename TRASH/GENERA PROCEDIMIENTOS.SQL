-----------------SEPARADO--------------------------------
-- 1. Habilitar xp_cmdshell si no está habilitado
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

-- 2. Variables de configuración
DECLARE @Modo VARCHAR(20) = 'DROP+CREATE';  
-- Opciones válidas: 'CREATE OR ALTER', 'ALTER', 'DROP+CREATE'

DECLARE @ObjName SYSNAME;
DECLARE @SchemaName SYSNAME;
DECLARE @FileName VARCHAR(400);
DECLARE @Comando VARCHAR(8000);

-- 3. Cursor para recorrer procedimientos, funciones y triggers
DECLARE cur CURSOR FOR
SELECT s.name AS SchemaName, o.name AS ObjName, o.type
FROM sys.objects o
INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
WHERE o.type IN ('P','FN','IF','TF','TR')
ORDER BY s.name, o.name;

OPEN cur;
FETCH NEXT FROM cur INTO @SchemaName, @ObjName, @Comando; -- @Comando aquí solo para capturar o.type

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Definir nombre de archivo: C:\Export\Schema.ObjName.sql
    SET @FileName = 'C:\Export\' + @SchemaName + '.' + @ObjName + '.sql';

    -- Construir comando sqlcmd con lógica de @Modo aplicada
    SET @Comando = 'sqlcmd -S ' + @@SERVERNAME +
                   ' -d ' + DB_NAME() +
                   ' -E -Q "SET NOCOUNT ON; ' +
                   'SELECT CASE ' +
                   'WHEN ''' + @Modo + ''' = ''CREATE OR ALTER'' THEN REPLACE(m.definition,''CREATE '',''CREATE OR ALTER '') ' +
                   'WHEN ''' + @Modo + ''' = ''ALTER'' THEN REPLACE(m.definition,''CREATE '',''ALTER '') ' +
                   'WHEN ''' + @Modo + ''' = ''DROP+CREATE'' THEN ' +
                   '    ''IF OBJECT_ID(''''' + @SchemaName + '.' + @ObjName + ''''') IS NOT NULL ' +
                   '     DROP '' + CASE o.type WHEN ''P'' THEN ''PROCEDURE'' WHEN ''FN'' THEN ''FUNCTION'' WHEN ''IF'' THEN ''FUNCTION'' WHEN ''TF'' THEN ''FUNCTION'' WHEN ''TR'' THEN ''TRIGGER'' END ' +
                   '     + '' ' + @SchemaName + '.' + @ObjName + ';'' + CHAR(13)+CHAR(10) + ''GO'' + CHAR(13)+CHAR(10) + m.definition ' +
                   'ELSE m.definition END ' +
                   'FROM sys.sql_modules m ' +
                   'INNER JOIN sys.objects o ON m.object_id = o.object_id ' +
                   'INNER JOIN sys.schemas s ON o.schema_id = s.schema_id ' +
                   'WHERE s.name = ''' + @SchemaName + ''' AND o.name = ''' + @ObjName + '''" ' +
                   '-o "' + @FileName + '" -h -1 -y 0 -w 65535';

    -- Ejecutar el comando
    EXEC xp_cmdshell @Comando;

    FETCH NEXT FROM cur INTO @SchemaName, @ObjName, @Comando;
END

CLOSE cur;
DEALLOCATE cur;



-------------------------TODO JUNTO---------------------------


-- 1. Habilitar xp_cmdshell si no está habilitado
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

-- 2. Variables de configuración
DECLARE @Modo VARCHAR(20) = 'DROP+CREATE';  
-- Opciones válidas: 'CREATE OR ALTER', 'ALTER', 'DROP+CREATE'

DECLARE @ObjName SYSNAME;
DECLARE @SchemaName SYSNAME;
DECLARE @Tipo CHAR(2);
DECLARE @Comando VARCHAR(8000);
DECLARE @RutaArchivo VARCHAR(400) = 'C:\Export\TodoJunto.sql';

-- 3. Inicializar archivo vacío
SET @Comando = 'cmd /c chcp 65001 >nul & echo. > "' + @RutaArchivo + '"';
EXEC xp_cmdshell @Comando;

-- 4. Cursor para recorrer procedimientos, funciones y triggers
DECLARE cur CURSOR FOR
SELECT s.name AS SchemaName, o.name AS ObjName, o.type
FROM sys.objects o
INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
WHERE o.type IN ('P','FN','IF','TF','TR')
ORDER BY s.name, o.name;

OPEN cur;
FETCH NEXT FROM cur INTO @SchemaName, @ObjName, @Tipo;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Construir comando sqlcmd con lógica de @Modo aplicada
    SET @Comando = 'cmd /c chcp 65001 >nul & sqlcmd -S ' + @@SERVERNAME +
                   ' -d ' + DB_NAME() +
                   ' -E -Q "SET NOCOUNT ON; ' +
                   'SELECT CASE ' +
                   'WHEN ''' + @Modo + ''' = ''CREATE OR ALTER'' THEN REPLACE(m.definition,''CREATE '',''CREATE OR ALTER '') ' +
                   'WHEN ''' + @Modo + ''' = ''ALTER'' THEN REPLACE(m.definition,''CREATE '',''ALTER '') ' +
                   'WHEN ''' + @Modo + ''' = ''DROP+CREATE'' THEN ' +
                   '    ''IF OBJECT_ID(''''' + @SchemaName + '.' + @ObjName + ''''') IS NOT NULL ' +
                   '     DROP '' + CASE o.type WHEN ''P'' THEN ''PROCEDURE'' WHEN ''FN'' THEN ''FUNCTION'' WHEN ''IF'' THEN ''FUNCTION'' WHEN ''TF'' THEN ''FUNCTION'' WHEN ''TR'' THEN ''TRIGGER'' END ' +
                   '     + '' ' + @SchemaName + '.' + @ObjName + ';'' + CHAR(13)+CHAR(10) + ''GO'' + CHAR(13)+CHAR(10) + m.definition ' +
                   'ELSE m.definition END ' +
                   'FROM sys.sql_modules m ' +
                   'INNER JOIN sys.objects o ON m.object_id = o.object_id ' +
                   'INNER JOIN sys.schemas s ON o.schema_id = s.schema_id ' +
                   'WHERE s.name = ''' + @SchemaName + ''' AND o.name = ''' + @ObjName + '''" ' +
                   '>> "' + @RutaArchivo + '" -h -1 -y 0 -w 65535';

    -- Ejecutar el comando (append al archivo maestro en UTF-8)
    EXEC xp_cmdshell @Comando;

    -- Separador GO entre objetos
    SET @Comando = 'cmd /c chcp 65001 >nul & echo GO >> "' + @RutaArchivo + '"';
    EXEC xp_cmdshell @Comando;

    FETCH NEXT FROM cur INTO @SchemaName, @ObjName, @Tipo;
END

CLOSE cur;
DEALLOCATE cur;