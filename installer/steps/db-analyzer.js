/**
 * db-analyzer.js — Analiza la BD destino y compara contra los scripts del paquete.
 * Detecta: tablas faltantes, columnas faltantes, SPs a aplicar, versión instalada.
 */
const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const { execSync } = require('child_process');

/**
 * Lee la versión del paquete instalador (inyectada por packager.js en database/version.json).
 */
function readPackageVersion(baseDir) {
    // baseDir puede ser la raíz del paquete o la carpeta installer/
    const vFile = fs.existsSync(path.join(baseDir, 'database'))
        ? path.join(baseDir, 'database', 'version.json')
        : path.join(baseDir, '..', 'database', 'version.json');

    if (fs.existsSync(vFile)) {
        try { return JSON.parse(fs.readFileSync(vFile, 'utf8')).version || '0.0.0'; } catch (_) { }
    }
    return '0.0.0';
}

/**
 * Compara dos versiones semver. Retorna: 'greater' | 'equal' | 'less'
 */
function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 'greater';
        if (na < nb) return 'less';
    }
    return 'equal';
}

/**
 * Prueba la conexión a SQL Server. Retorna { ok, message }.
 */
async function testConnection(cfg) {
    let pool;
    try {
        pool = await sql.connect(buildSqlConfig(cfg));
        await pool.request().query('SELECT 1 AS ping');
        await pool.close();
        return { ok: true, message: 'Conexión exitosa a SQL Server.' };
    } catch (err) {
        if (pool) { try { await pool.close(); } catch (_) { } }
        return { ok: false, message: `Error de conexión: ${err.message}` };
    }
}

/**
 * Verifica si Node.js está instalado (necesario para el launcher).
 */
async function checkSystemRequirements() {
    try {
        execSync('node -v', { stdio: 'ignore' });
        return { ok: true };
    } catch (_) {
        return { ok: false, message: 'Node.js no está instalado o no se encuentra en el PATH. El gestor de servicio (launcher) no funcionará correctamente. Se recomienda instalar Node.js compatible.' };
    }
}

/**
 * Analiza la BD destino:
 *  - tablesToCreate: tablas que no existen en destino (tienen script en /database/sql/tablas/)
 *  - columnsToAdd:   columnas faltantes en tablas existentes
 *  - spsToApply:     todos los SPs del paquete (excepto exclusiones)
 *  - isFirstInstall: true si la BD está vacía / no tiene tablas del sistema
 */
async function analyzeDatabase(cfg, baseDir) {
    const pkgRoot = fs.existsSync(path.join(baseDir, 'database')) ? baseDir : path.join(baseDir, '..');
    const dbDir = path.join(pkgRoot, 'database', 'sql');
    const tablasDir = path.join(dbDir, 'tablas');
    const procsDir = path.join(dbDir, 'procedimientos');
    const funcDir = path.join(dbDir, 'funciones');
    const exclusions = loadExclusions(pkgRoot);

    let pool;
    try {
        pool = await sql.connect(buildSqlConfig(cfg));

        // ── Obtener inventario de tablas en destino ───────────────────────────
        const tablesRes = await pool.request().query(`
      SELECT t.name AS TableName, s.name AS SchemaName
      FROM sys.tables t
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      WHERE t.is_ms_shipped = 0
    `);
        const destTables = new Set(tablesRes.recordset.map(r => `${r.SchemaName}.${r.TableName}`));

        // ── Obtener inventario de columnas en destino ─────────────────────────
        const colsRes = await pool.request().query(`
      SELECT s.name AS SchemaName, t.name AS TableName, c.name AS ColName
      FROM sys.columns c
      JOIN sys.tables t ON t.object_id = c.object_id
      JOIN sys.schemas s ON s.schema_id = t.schema_id
      WHERE t.is_ms_shipped = 0
    `);
        const destCols = new Set(colsRes.recordset.map(r => `${r.SchemaName}.${r.TableName}.${r.ColName}`));

        // ── Analizar tablas del paquete ───────────────────────────────────────
        const tablesToCreate = [];
        const columnsToAdd = [];
        let totalSystemTables = 0;

        if (fs.existsSync(tablasDir)) {
            const tablaFiles = fs.readdirSync(tablasDir).filter(f => f.endsWith('.sql'));
            totalSystemTables = tablaFiles.length;
            for (const file of tablaFiles) {
                // Nombre de archivo: dbo.NombreTabla.sql  →  schemaName.tableName
                const parts = file.replace('.sql', '').split('.');
                if (parts.length < 2) continue;
                const schemaName = parts[0];
                const tableName = parts[1];
                const key = `${schemaName}.${tableName}`;
                const sqlContent = fs.readFileSync(path.join(tablasDir, file), 'utf8');

                if (!destTables.has(key)) {
                    tablesToCreate.push({ schema: schemaName, table: tableName, sql: sqlContent, file });
                } else {
                    // Tabla existe → detectar columnas faltantes
                    const colsInScript = extractColumnsFromCreateSQL(sqlContent);
                    for (const col of colsInScript) {
                        if (!destCols.has(`${key}.${col.name}`)) {
                            columnsToAdd.push({
                                schema: schemaName,
                                table: tableName,
                                column: col.name,
                                definition: col.definition,
                            });
                        }
                    }
                }
            }
        }

        // ── Cargar todos los SPs del paquete (excepto blacklist) ──────────────
        const spsToApply = [];
        if (fs.existsSync(procsDir)) {
            const spFiles = fs.readdirSync(procsDir).filter(f => f.endsWith('.sql'));
            for (const file of spFiles) {
                const parts = file.replace('.sql', '').split('.');
                const schemaName = parts[0] || 'dbo';
                const spName = parts.slice(1).join('.');
                const fullName = `${schemaName}.${spName}`;
                if (exclusions.includes(fullName)) continue;
                const sqlContent = fs.readFileSync(path.join(procsDir, file), 'utf8');
                spsToApply.push({ name: fullName, file, sql: sqlContent, filePath: path.join(procsDir, file) });
            }
        }

        // ── Cargar todas las funciones del paquete ────────────────────────────
        const functionsToApply = [];
        if (fs.existsSync(funcDir)) {
            const funcFiles = fs.readdirSync(funcDir).filter(f => f.endsWith('.sql'));
            for (const file of funcFiles) {
                const parts = file.replace('.sql', '').split('.');
                const schemaName = parts[0] || 'dbo';
                const funcName = parts.slice(1).join('.');
                const fullName = `${schemaName}.${funcName}`;
                const sqlContent = fs.readFileSync(path.join(funcDir, file), 'utf8');
                functionsToApply.push({ name: fullName, file, sql: sqlContent, filePath: path.join(funcDir, file) });
            }
        }

        const isFirstInstall = destTables.size === 0;

        // ── Leer versión instalada en BD usando Propiedades Extendidas (Nativo) ──
        const pkgVersion = readPackageVersion(baseDir);
        let installedVersion = null;

        try {
            const vr = await pool.request().query(`
                SELECT CAST(value AS NVARCHAR(50)) AS Valor 
                FROM sys.extended_properties 
                WHERE name = 'CA3_Version'
            `);
            if (vr.recordset.length > 0) installedVersion = vr.recordset[0].Valor;
        } catch (_) { /* Propiedad no existe */ }

        // ── Validar si la base de datos es efectivamente del sistema CA3 ──────
        if (!isFirstInstall && !installedVersion) {
            // No está vacía y no tiene nuestra firma CA3_Version.
            // Si le faltan crear más del 80% de las tablas del sistema, es casi seguro que es otra BD
            if (totalSystemTables > 0 && (tablesToCreate.length / totalSystemTables) > 0.8) {
                await pool.close();
                throw new Error("La base de datos seleccionada no es válida para actualizar. Por favor, asegúrese de elegir la base de datos correcta del sistema, o especifique una base de datos nueva y totalmente vacía.");
            }
        }

        let versionInfo;
        if (!installedVersion || isFirstInstall) {
            versionInfo = { pkgVersion, installedVersion: null, status: 'first_install' };
        } else {
            const cmp = compareVersions(pkgVersion, installedVersion);
            versionInfo = {
                pkgVersion,
                installedVersion,
                status: cmp === 'greater' ? 'upgrade' : (cmp === 'equal' ? 'same' : 'downgrade'),
            };
        }

        await pool.close();

        return {
            isFirstInstall,
            tablesToCreate,
            columnsToAdd,
            spsToApply,
            functionsToApply,
            exclusions,
            versionInfo,
            summary: {
                tablas: tablesToCreate.length,
                columnas: columnsToAdd.length,
                procedimientos: spsToApply.length,
                funciones: functionsToApply.length,
                excluidos: exclusions.length,
                versionInstalada: installedVersion,
                versionPaquete: pkgVersion,
            }
        };
    } catch (err) {
        if (pool) { try { await pool.close(); } catch (_) { } }
        throw new Error(`Error analizando base de datos: ${err.message}`);
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
        connectionTimeout: 10000,
        requestTimeout: 30000,
    };
}

function loadExclusions(baseDir) {
    const pkgRoot = fs.existsSync(path.join(baseDir, 'database')) ? baseDir : path.join(baseDir, '..');
    const exclusionsFile = path.join(pkgRoot, 'database', 'sp-exclusions.json');

    if (fs.existsSync(exclusionsFile)) {
        try { return JSON.parse(fs.readFileSync(exclusionsFile, 'utf8')).excluded || []; } catch (_) { }
    }
    return [];
}

/**
 * Extrae nombres de columnas y sus definiciones de un CREATE TABLE SQL.
 * Heurístico: busca líneas que empiecen con [NombreColumna] tipo...
 */
function extractColumnsFromCreateSQL(sqlText) {
    const cols = [];
    const lines = sqlText.split(/\r?\n/);
    // Regex para: [ColName] type(len) NULL|NOT NULL ...
    const colRegex = /^\s*\[([^\]]+)\]\s+(\w+(?:\([\w,\s]+\))?.*?)(?:,)?\s*$/i;
    // Ignoramos líneas de constraints y delimitadores
    const skipWords = ['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'FOREIGN', 'CHECK', 'INDEX', 'CREATE', 'GO', 'ALTER'];
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || skipWords.some(w => trimmed.toUpperCase().startsWith(w))) continue;
        const m = trimmed.match(/^\[([^\]]+)\]\s+(.+)$/);
        if (m) {
            const name = m[1];
            // Limpiar coma al final de la definición
            const definition = m[2].replace(/,\s*$/, '').trim();
            cols.push({ name, definition });
        }
    }
    return cols;
}

module.exports = { testConnection, analyzeDatabase, checkSystemRequirements };
