-- SCRIPT A (V5 - CORREGIDO): WRAPPER PARA EVITAR ERROR 1086
-- Ejecutar en Base de Datos ORIGEN
SELECT (
    SELECT * FROM (
        -- === BLOQUE 1: COLUMNAS ===
        SELECT 
            'Columns' AS [Type],
            t.name AS [Table],
            c.name AS [ColName],
            typ.name AS [DataType],
            c.max_length AS [MaxLen],
            c.precision AS [Prec],
            c.scale AS [Scale],
            c.is_nullable AS [IsNull],
            NULL AS [RefTable], 
            NULL AS [ColList], 
            NULL AS [IsUnique]
        FROM sys.tables t
        INNER JOIN sys.columns c ON t.object_id = c.object_id
        INNER JOIN sys.types typ ON c.user_type_id = typ.user_type_id
        WHERE t.is_ms_shipped = 0 
        
        UNION ALL

        -- === BLOQUE 2: PRIMARY KEYS ===
        SELECT 
            'PK',
            t.name,
            kc.name,
            NULL, NULL, NULL, NULL, NULL,
            NULL,
            STUFF((SELECT ',' + c.name
                   FROM sys.index_columns ic
                   INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                   WHERE ic.object_id = t.object_id AND ic.index_id = kc.unique_index_id
                   ORDER BY ic.key_ordinal
                   FOR XML PATH('')), 1, 1, '') AS [ColList],
            NULL
        FROM sys.key_constraints kc
        INNER JOIN sys.tables t ON kc.parent_object_id = t.object_id
        WHERE kc.type = 'PK'

        UNION ALL

        -- === BLOQUE 3: FOREIGN KEYS ===
        SELECT 
            'FK',
            t.name,
            fk.name,
            NULL, NULL, NULL, NULL, NULL,
            rt.name AS [RefTable],
            STUFF((SELECT ',' + c.name
                   FROM sys.foreign_key_columns fkc
                   INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
                   WHERE fkc.constraint_object_id = fk.object_id
                   FOR XML PATH('')), 1, 1, '') AS [ColList],
            NULL
        FROM sys.foreign_keys fk
        INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
        INNER JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id

        UNION ALL

        -- === BLOQUE 4: INDICES ===
        SELECT 
            'IX',
            t.name,
            i.name,
            NULL, NULL, NULL, NULL, NULL,
            NULL,
            STUFF((SELECT ',' + c.name
                   FROM sys.index_columns ic
                   INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
                   WHERE ic.object_id = t.object_id AND ic.index_id = i.index_id
                   ORDER BY ic.key_ordinal
                   FOR XML PATH('')), 1, 1, '') AS [ColList],
            i.is_unique
        FROM sys.indexes i
        INNER JOIN sys.tables t ON i.object_id = t.object_id
        WHERE i.is_primary_key = 0 AND i.type_desc <> 'HEAP' AND t.is_ms_shipped = 0

    ) AS UnifiedData -- <--- ESTA ES LA ENVOLTURA NECESARIA
    ORDER BY [Table], [Type] -- Ordenamos para que quede bonito
    FOR JSON PATH
) AS [processing-instruction(json)]
FOR XML PATH('');

