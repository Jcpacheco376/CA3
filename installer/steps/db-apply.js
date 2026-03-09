/**
 * db-apply.js — Aplica los cambios detectados por db-analyzer en la BD destino.
 * - Crea tablas faltantes
 * - Agrega columnas faltantes (ALTER TABLE ADD COLUMN)
 * - Aplica todos los SPs (CREATE OR ALTER)
 * - Registra la versión del paquete en dbo.SISConfiguracion
 * - Guarda log de errores en /logs/
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');

async function applyDatabase(cfg, analysis, baseDir, log, onProgress) {
    const pkgRoot = fs.existsSync(path.join(baseDir, 'database')) ? baseDir : path.join(baseDir, '..');
    const { tablesToCreate, columnsToAdd, spsToApply } = analysis;
    const total = tablesToCreate.length + columnsToAdd.length + spsToApply.length || 1;
    let done = 0;
    const errors = [];
    let pool;

    try {
        pool = await sql.connect(buildSqlConfig(cfg));
        log(`Conectado a ${cfg.DB_SERVER}/${cfg.DB_DATABASE}`);

        // ── PASO 1: Crear tablas faltantes ───────────────────────────────────
        if (tablesToCreate.length > 0) {
            log(`Creando ${tablesToCreate.length} tabla(s) faltante(s)...`);
            for (const t of tablesToCreate) {
                try {
                    await execScript(pool, t.sql);
                    log(`  ✅ Tabla creada: ${t.schema}.${t.table}`);
                } catch (err) {
                    const msg = `  ❌ Error creando tabla ${t.schema}.${t.table}: ${err.message}`;
                    log(msg); errors.push(msg);
                }
                done++; onProgress(done / total);
            }
        }

        // ── PASO 2: Agregar columnas faltantes ───────────────────────────────
        if (columnsToAdd.length > 0) {
            log(`Agregando ${columnsToAdd.length} columna(s) faltante(s)...`);
            for (const c of columnsToAdd) {
                const alterSQL = `ALTER TABLE [${c.schema}].[${c.table}] ADD [${c.column}] ${c.definition};`;
                try {
                    await pool.request().query(alterSQL);
                    log(`  ✅ Columna agregada: ${c.schema}.${c.table}.${c.column}`);
                } catch (err) {
                    const msg = `  ❌ Error en columna ${c.schema}.${c.table}.${c.column}: ${err.message}`;
                    log(msg); errors.push(msg);
                }
                done++; onProgress(done / total);
            }
        }

        // ── PASO 3: Aplicar todos los SPs ────────────────────────────────────
        if (spsToApply.length > 0) {
            log(`Aplicando ${spsToApply.length} procedimiento(s)...`);
            for (const sp of spsToApply) {
                try {
                    // Limpiar header de comentarios antes de enviar a SQL Server
                    const spSQL = forceCreateOrAlter(stripHeader(sp.sql));
                    // Pasar cfg y sp.filePath para que execScript pueda usar sqlcmd.exe
                    await execScript(pool, spSQL, cfg, sp.filePath);
                    log(`  ✅ SP aplicado: ${sp.name}`);
                } catch (err) {
                    const msg = `  ❌ Error en SP ${sp.name}: ${err.message}`;
                    log(msg); errors.push(msg);
                }
                done++; onProgress(done / total);
            }
        }

        // ── PASO 4: Registrar versión en BD (Propiedades Extendidas) ─────────
        try {
            // Leer versión del paquete
            let pkgVersion = '0.0.0';
            const vFile = path.join(pkgRoot, 'database', 'version.json');
            if (fs.existsSync(vFile)) {
                try { pkgVersion = JSON.parse(fs.readFileSync(vFile, 'utf8')).version || '0.0.0'; } catch (_) { }
            }
            // UPSERT en sys.extended_properties
            const request = pool.request();
            request.input('valor', sql.NVarChar(50), pkgVersion);
            await request.query(`
                IF EXISTS (SELECT 1 FROM sys.extended_properties WHERE name = N'CA3_Version')
                BEGIN
                    EXEC sys.sp_updateextendedproperty @name = N'CA3_Version', @value = @valor
                END
                ELSE
                BEGIN
                    EXEC sys.sp_addextendedproperty @name = N'CA3_Version', @value = @valor
                END
            `);
            log(`✅ Versión ${pkgVersion} registrada exitosamente como Propiedad Extendida en la BD.`);
        } catch (err) {
            log(`⚠️  No se pudo guardar la versión en BD: ${err.message}`);
        }

        await pool.close();

        // ── Guardar log de errores si los hay ────────────────────────────────
        if (errors.length > 0) {
            const logDir = path.join(pkgRoot, 'logs');
            if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
            const logFile = path.join(logDir, `db-errors-${Date.now()}.log`);
            fs.writeFileSync(logFile, errors.join('\n'), 'utf8');
            log(`⚠️  Hubo ${errors.length} error(es). Revisa: ${logFile}`);
        }

        return { errors };

    } catch (err) {
        if (pool) { try { await pool.close(); } catch (_) { } }
        throw err;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function buildSqlConfig(cfg) {
    return {
        server: cfg.DB_SERVER,
        database: cfg.DB_DATABASE,
        user: cfg.DB_USER,
        password: cfg.DB_PASSWORD,
        port: parseInt(cfg.DB_PORT) || 1433,
        options: { trustServerCertificate: true, encrypt: false },
        connectionTimeout: 15000,
        requestTimeout: 60000,
    };
}

// ── Buscar sqlcmd.exe en rutas comunes de SQL Server ──────────────────────
function findSqlcmd() {
    const candidates = [
        'sqlcmd',                                                                    // En PATH
        'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\sqlcmd.exe',
        'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\130\\Tools\\Binn\\sqlcmd.exe',
        'C:\\Program Files\\Microsoft SQL Server\\110\\Tools\\Binn\\sqlcmd.exe',
        'C:\\Program Files (x86)\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\sqlcmd.exe',
    ];
    for (const c of candidates) {
        try {
            const { execSync } = require('child_process');
            execSync(`"${c}" -?`, { stdio: 'ignore', timeout: 3000 });
            return c;
        } catch (_) { }
    }
    return null;
}
let _sqlcmd = undefined;

async function execScript(pool, sqlText, cfg, filePath) {
    // Intentar usar sqlcmd.exe si está disponible (maneja GO, encoding y Unicode mejor que mssql.query)
    if (_sqlcmd === undefined) _sqlcmd = findSqlcmd();

    if (_sqlcmd && cfg && filePath) {
        // Escribir el SQL a un archivo temporal para que sqlcmd lo lea directamente
        const tmpFile = filePath + '.tmp.sql';
        try {
            // Escribir en UTF-8 con BOM — sqlcmd 13+ lee UTF-8 con BOM correctamente (flag -f 65001)
            const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
            fs.writeFileSync(tmpFile, Buffer.concat([bom, Buffer.from(sqlText, 'utf8')]));
            const { execSync } = require('child_process');
            const server = cfg.DB_SERVER + (cfg.DB_PORT && cfg.DB_PORT !== '1433' ? `,${cfg.DB_PORT}` : '');
            const database = cfg.DB_DATABASE;
            const cmd = cfg.DB_USER
                ? `"${_sqlcmd}" -S "${server}" -d "${database}" -U "${cfg.DB_USER}" -P "${cfg.DB_PASSWORD}" -i "${tmpFile}" -b -f 65001`
                : `"${_sqlcmd}" -S "${server}" -d "${database}" -E -i "${tmpFile}" -b -f 65001`;
            execSync(cmd, { stdio: 'pipe', timeout: 60000 });
            return; // Éxito
        } catch (err) {
            // Si sqlcmd falla, caer al método mssql
        } finally {
            try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) { }
        }
    }

    // Fallback: mssql.query — dividir por GO y ejecutar por batch
    const batches = sqlText
        .split(/^\s*GO\s*$/im)
        .map(b => b.trim())
        .filter(b => b.length > 0);
    for (const batch of batches) {
        await pool.request().query(batch);
    }
}

/**
 * Elimina el bloque de comentarios de encabezado generado por export-sql.js.
 * Necesario porque los caracteres Unicode (──) del header confunden al driver mssql
 * y provocan el error 'CREATE/ALTER PROCEDURE must be the first statement'.
 */
function stripHeader(sqlText) {
    // Si la cadena empieza con BOM UTF-8, remover el BOM.
    if (sqlText.charCodeAt(0) === 0xFEFF) {
        sqlText = sqlText.slice(1);
    }

    // Eliminar líneas de comentarios (--) y líneas vacías al inicio del texto SQL.
    // Enfoque línea-a-línea: más robusto que regex con cuantificadores * o +.
    // Necesario porque los caracteres Unicode (──) del encabezado confunden al driver mssql.
    const lines = sqlText.split(/\r?\n/);
    let firstCode = 0;
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t !== '' && !t.startsWith('--')) {
            firstCode = i;
            break;
        }
    }
    return lines.slice(firstCode).join('\n').trim();
}

function forceCreateOrAlter(sqlText) {
    return sqlText
        .replace(/\bCREATE\s+OR\s+ALTER\s+PROCEDURE\b/gi, '__CA_PROC__')
        .replace(/\bCREATE\s+OR\s+ALTER\s+PROC\b/gi, '__CA_PROC__')
        .replace(/\bALTER\s+PROCEDURE\b/gi, '__CA_PROC__')
        .replace(/\bALTER\s+PROC\b/gi, '__CA_PROC__')
        .replace(/\bCREATE\s+PROCEDURE\b/gi, '__CA_PROC__')
        .replace(/\bCREATE\s+PROC\b/gi, '__CA_PROC__')
        // Funciones: mismo patrón
        .replace(/\bCREATE\s+OR\s+ALTER\s+FUNCTION\b/gi, '__CA_FUNC__')
        .replace(/\bALTER\s+FUNCTION\b/gi, '__CA_FUNC__')
        .replace(/\bCREATE\s+FUNCTION\b/gi, '__CA_FUNC__')
        // Restaurar a sintaxis final
        .replace(/__CA_PROC__/g, 'CREATE OR ALTER PROCEDURE')
        .replace(/__CA_FUNC__/g, 'CREATE OR ALTER FUNCTION');
}

module.exports = { applyDatabase };
