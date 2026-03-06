SET NOCOUNT ON;

-- 1. PEGA AQUÍ EL RESULTADO DEL SCRIPT 1 (DESTINO)
DECLARE @DestinoHashes TABLE (Nombre NVARCHAR(256), HashVal VARBINARY(64));

-- =========================================================
-- PEGA TUS INSERTS AQUI
-- =========================================================
-- INSERT INTO @DestinoHashes VALUES ...



-- =========================================================
-- 2. EXCLUSIONES
-- =========================================================
DECLARE @Excluidos TABLE (Nombre NVARCHAR(256));
INSERT INTO @Excluidos (Nombre) VALUES 
('dbo.sp_ConfiguracionLocal'); -- Tus excepciones aquí


-- =========================================================
-- 3. GENERACIÓN CON "CREATE OR ALTER" FORZADO
-- =========================================================

SELECT (
    SELECT 
        CHAR(13) + CHAR(10) + 'GO' + CHAR(13) + CHAR(10) +
        'PRINT ''Procesando: ' + s.name + '.' + p.name + '''' + CHAR(13) + CHAR(10) +
        'GO' + CHAR(13) + CHAR(10) +
        
        -- LÓGICA DE REEMPLAZO AGRESIVA
        -- Convierte cualquier definición (CREATE o ALTER) en CREATE OR ALTER
        REPLACE(
            REPLACE(
                REPLACE(
                    REPLACE(
                        m.definition, 
                        'CREATE PROCEDURE', 'CREATE OR ALTER PROCEDURE'), -- Caso 1
                        'CREATE PROC',      'CREATE OR ALTER PROC'),      -- Caso 2
                        'ALTER PROCEDURE',  'CREATE OR ALTER PROCEDURE'), -- Caso 3 (Por si el origen guarda ALTER)
                        'ALTER PROC',       'CREATE OR ALTER PROC'        -- Caso 4
        ) 
        
    FROM sys.procedures p
    INNER JOIN sys.sql_modules m ON p.object_id = m.object_id
    INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
    LEFT JOIN @DestinoHashes d ON (s.name + '.' + p.name) = d.Nombre
    LEFT JOIN @Excluidos e ON (s.name + '.' + p.name) = e.Nombre
    
    WHERE 
        p.is_ms_shipped = 0
        AND e.Nombre IS NULL
        AND (
            d.Nombre IS NULL -- Es nuevo
            OR 
            -- Comparamos HASH normalizado (sin espacios) para detectar cambios reales
            d.HashVal <> HASHBYTES('SHA2_256', 
                UPPER(REPLACE(REPLACE(REPLACE(REPLACE(
                    m.definition, 
                ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(13), ''))
            )
        )
    
    FOR XML PATH(''), TYPE
).value('.', 'NVARCHAR(MAX)') AS [ScriptDeActualizacion];