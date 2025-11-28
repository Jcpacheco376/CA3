/////////////////////HELPER////////////////////////////////
CREATE OR ALTER PROCEDURE dbo.usp_ScriptCreateTableFull
    @SchemaName sysname,
    @TableName  sysname
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @sql nvarchar(max) = '';

    -- Columnas con tipos, identity y default
    SELECT @sql = @sql +
        ',' + CHAR(13)+CHAR(10) +
        QUOTENAME(c.name) + ' ' +
        t.name +
        CASE 
            WHEN t.name IN ('varchar','nvarchar','char','nchar') AND c.max_length > 0
                THEN '(' + CASE WHEN c.max_length = -1 THEN 'MAX'
                                ELSE CAST(c.max_length AS varchar(10)) END + ')'
            WHEN t.name IN ('decimal','numeric')
                THEN '(' + CAST(c.precision AS varchar(10)) + ',' + CAST(c.scale AS varchar(10)) + ')'
            ELSE ''
        END +
        CASE WHEN c.is_identity = 1
             THEN ' IDENTITY(' + CAST(ic.seed_value AS varchar) + ',' + CAST(ic.increment_value AS varchar) + ')'
             ELSE ''
        END +
        CASE WHEN dc.definition IS NOT NULL
             THEN ' DEFAULT ' + dc.definition
             ELSE ''
        END +
        CASE WHEN c.is_nullable = 0 THEN ' NOT NULL' ELSE ' NULL' END
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    LEFT JOIN sys.identity_columns ic ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
    WHERE c.object_id = OBJECT_ID(@SchemaName + '.' + @TableName)
    ORDER BY c.column_id;

    SET @sql = 'CREATE TABLE ' + QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName) +
               ' (' + CHAR(13)+CHAR(10) + STUFF(@sql,1,1,'') ;

    -- Primary keys / unique constraints con opciones
    SELECT @sql = @sql + ',' + CHAR(13)+CHAR(10) +
        'CONSTRAINT ' + QUOTENAME(i.name) + ' ' +
        CASE WHEN i.is_primary_key = 1 THEN 'PRIMARY KEY ' ELSE 'UNIQUE ' END +
        CASE WHEN i.type_desc LIKE '%CLUSTERED%' THEN i.type_desc ELSE 'NONCLUSTERED' END +
        ' (' +
        STRING_AGG(QUOTENAME(c.name) + CASE ic.is_descending_key WHEN 1 THEN ' DESC' ELSE ' ASC' END, ', ')
            WITHIN GROUP (ORDER BY ic.key_ordinal) +
        ') WITH (' +
        'PAD_INDEX = ' + CASE WHEN i.has_filter = 1 THEN 'ON' ELSE 'OFF' END + ', ' +
        'ALLOW_ROW_LOCKS = ' + CASE WHEN i.allow_row_locks = 1 THEN 'ON' ELSE 'OFF' END + ', ' +
        'ALLOW_PAGE_LOCKS = ' + CASE WHEN i.allow_page_locks = 1 THEN 'ON' ELSE 'OFF' END +
        ') ON [PRIMARY]'
    FROM sys.indexes i
    JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE i.object_id = OBJECT_ID(@SchemaName + '.' + @TableName)
      AND (i.is_primary_key = 1 OR i.is_unique_constraint = 1)
    GROUP BY i.name, i.is_primary_key, i.type_desc, i.has_filter, i.allow_row_locks, i.allow_page_locks;

    SET @sql = @sql + CHAR(13)+CHAR(10) + ') ON [PRIMARY]';

    -- Foreign keys
    SELECT @sql = @sql + CHAR(13)+CHAR(10) +
        'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName) +
        ' ADD CONSTRAINT ' + QUOTENAME(fk.name) +
        ' FOREIGN KEY(' + QUOTENAME(c.name) + ')' +
        ' REFERENCES ' + QUOTENAME(s2.name) + '.' + QUOTENAME(t2.name) +
        '(' + QUOTENAME(c2.name) + ');'
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
    JOIN sys.columns c2 ON fkc.referenced_object_id = c2.object_id AND fkc.referenced_column_id = c2.column_id
    JOIN sys.tables t2 ON fk.referenced_object_id = t2.object_id
    JOIN sys.schemas s2 ON t2.schema_id = s2.schema_id
    WHERE fk.parent_object_id = OBJECT_ID(@SchemaName + '.' + @TableName);

    -- Check constraints
    SELECT @sql = @sql + CHAR(13)+CHAR(10) +
        'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName) +
        ' ADD CONSTRAINT ' + QUOTENAME(cc.name) +
        ' CHECK ' + cc.definition + ';'
    FROM sys.check_constraints cc
    WHERE cc.parent_object_id = OBJECT_ID(@SchemaName + '.' + @TableName);

    SELECT @sql;
END

go
///////////////SEPARADO////////////////////////////////
-- Habilitar xp_cmdshell si no está habilitado
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

DECLARE @SchemaName sysname;
DECLARE @TableName  sysname;
DECLARE @FileName   varchar(400);
DECLARE @Cmd        varchar(8000);

DECLARE cur CURSOR FOR
SELECT s.name AS SchemaName, t.name AS TableName
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
ORDER BY s.name, t.name;

OPEN cur;
FETCH NEXT FROM cur INTO @SchemaName, @TableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @FileName = 'C:\Export\tablas\' + @SchemaName + '.' + @TableName + '.sql';

    -- Forzar UTF-8 en cmd y llamar al proc extendido con parámetros simples
    SET @Cmd = 'cmd /c chcp 65001 >nul & sqlcmd -S ' + @@SERVERNAME +
               ' -d ' + DB_NAME() +
               ' -E -Q "SET NOCOUNT ON; EXEC dbo.usp_ScriptCreateTableFull @SchemaName=N''' + @SchemaName +
               ''', @TableName=N''' + @TableName + ''';" -h -1 -y 0 -w 65535 -o "' + @FileName + '"';

    EXEC xp_cmdshell @Cmd;

    FETCH NEXT FROM cur INTO @SchemaName, @TableName;
END

CLOSE cur;
DEALLOCATE cur;

//////////////////TODO JUNTO /////////////////////////////


-- Habilitar xp_cmdshell si no está habilitado
EXEC sp_configure 'show advanced options', 1;
RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1;
RECONFIGURE;

DECLARE @SchemaName sysname;
DECLARE @TableName  sysname;
DECLARE @Cmd        varchar(8000);
DECLARE @FileName   varchar(400) = 'C:\Export\Tablas_TodoJunto.sql';

-- Inicializar archivo vacío en UTF-8
SET @Cmd = 'cmd /c chcp 65001 >nul & echo. > "' + @FileName + '"';
EXEC xp_cmdshell @Cmd;

-- Cursor para recorrer todas las tablas en orden alfabético
DECLARE cur CURSOR FOR
SELECT s.name AS SchemaName, t.name AS TableName
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
ORDER BY s.name, t.name;

OPEN cur;
FETCH NEXT FROM cur INTO @SchemaName, @TableName;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Concatenar cada tabla al archivo maestro
    SET @Cmd = 'cmd /c chcp 65001 >nul & sqlcmd -S ' + @@SERVERNAME +
               ' -d ' + DB_NAME() +
               ' -E -Q "SET NOCOUNT ON; EXEC dbo.usp_ScriptCreateTableFull @SchemaName=N''' + @SchemaName +
               ''', @TableName=N''' + @TableName + ''';" -h -1 -y 0 -w 65535 >> "' + @FileName + '"';

    EXEC xp_cmdshell @Cmd;

    -- Separador GO entre tablas
    SET @Cmd = 'cmd /c chcp 65001 >nul & echo GO >> "' + @FileName + '"';
    EXEC xp_cmdshell @Cmd;

    FETCH NEXT FROM cur INTO @SchemaName, @TableName;
END

CLOSE cur;
DEALLOCATE cur;