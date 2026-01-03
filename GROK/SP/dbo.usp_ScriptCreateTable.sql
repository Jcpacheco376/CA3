IF OBJECT_ID('dbo.usp_ScriptCreateTable') IS NOT NULL      DROP PROCEDURE dbo.usp_ScriptCreateTable;
GO
CREATE PROCEDURE dbo.usp_ScriptCreateTable
    @SchemaName sysname,
    @TableName  sysname
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ddl nvarchar(max) = '';
    ;WITH cols AS (
        SELECT 
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.CHARACTER_MAXIMUM_LENGTH,
            c.NUMERIC_PRECISION,
            c.NUMERIC_SCALE,
            c.DATETIME_PRECISION,
            c.IS_NULLABLE,
            c.ORDINAL_POSITION
        FROM INFORMATION_SCHEMA.COLUMNS c
        WHERE c.TABLE_SCHEMA = @SchemaName
          AND c.TABLE_NAME  = @TableName
    )
    SELECT @ddl =
        'CREATE TABLE ' + QUOTENAME(@SchemaName) + '.' + QUOTENAME(@TableName) + ' (' + CHAR(13)+CHAR(10) +
        STUFF((
            SELECT 
                ',' + CHAR(13)+CHAR(10) +
                QUOTENAME(COLUMN_NAME) + ' ' +
                DATA_TYPE +
                CASE 
                    WHEN DATA_TYPE IN ('varchar','char')
                         AND CHARACTER_MAXIMUM_LENGTH IS NOT NULL
                        THEN '(' + CASE WHEN CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX'
                                        ELSE CAST(CHARACTER_MAXIMUM_LENGTH AS varchar(10)) END + ')'
                    WHEN DATA_TYPE IN ('nvarchar','nchar')
                         AND CHARACTER_MAXIMUM_LENGTH IS NOT NULL
                        THEN '(' + CASE WHEN CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX'
                                        ELSE CAST(CHARACTER_MAXIMUM_LENGTH AS varchar(10)) END + ')'
                    WHEN DATA_TYPE IN ('varbinary','binary')
                         AND CHARACTER_MAXIMUM_LENGTH IS NOT NULL
                        THEN '(' + CASE WHEN CHARACTER_MAXIMUM_LENGTH = -1 THEN 'MAX'
                                        ELSE CAST(CHARACTER_MAXIMUM_LENGTH AS varchar(10)) END + ')'
                    WHEN DATA_TYPE IN ('decimal','numeric')
                         AND NUMERIC_PRECISION IS NOT NULL
                        THEN '(' + CAST(NUMERIC_PRECISION AS varchar(10)) + ',' + CAST(NUMERIC_SCALE AS varchar(10)) + ')'
                    WHEN DATA_TYPE IN ('datetime2','time')
                         AND DATETIME_PRECISION IS NOT NULL
                        THEN '(' + CAST(DATETIME_PRECISION AS varchar(10)) + ')'
                    ELSE ''
                END +
                CASE WHEN IS_NULLABLE = 'NO' THEN ' NOT NULL' ELSE ' NULL' END
            FROM cols
            ORDER BY ORDINAL_POSITION
            FOR XML PATH(''), TYPE
        ).value('.', 'nvarchar(max)'), 1, 2, '') +
        CHAR(13)+CHAR(10) + ')';
    
    SELECT @ddl;
END

