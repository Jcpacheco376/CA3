-- SCRIPT 1 (V2): INVENTARIO NORMALIZADO (Ejecutar en DESTINO)
SET NOCOUNT ON;

PRINT 'DECLARE @DestinoHashes TABLE (Nombre NVARCHAR(256), HashVal VARBINARY(64));'

SELECT 
    'INSERT INTO @DestinoHashes VALUES (''' + s.name + '.' + p.name + ''', ' + 
    -- Aquí aplicamos la limpieza antes del HASH
    CONVERT(VARCHAR(MAX), HASHBYTES('SHA2_256', 
        UPPER(
            REPLACE(
            REPLACE(
            REPLACE(
            REPLACE(
                m.definition, 
            ' ', ''),       -- Quitar Espacios
            CHAR(9), ''),   -- Quitar Tabuladores
            CHAR(10), ''),  -- Quitar Salto Linea
            CHAR(13), '')   -- Quitar Retorno Carro
        )
    ), 1) + ');' 
    AS InventoryScript
FROM sys.procedures p
INNER JOIN sys.sql_modules m ON p.object_id = m.object_id
INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
WHERE p.is_ms_shipped = 0
ORDER BY p.name;