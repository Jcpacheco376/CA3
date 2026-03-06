#!/usr/bin/env node
/**
 * export-sql.js — Exporta automáticamente desde la BD de desarrollo
 *                  a los scripts SQL del proyecto (SQL/procedimientos/ y SQL/tablas/)
 *
 * Uso:
 *   node scripts/export-sql.js [--dry-run]
 *
 * Requiere: .env.dev en la raíz con las credenciales de la BD de desarrollo
 *
 * Archivo .env.dev de ejemplo:
 *   DEV_DB_SERVER=localhost
 *   DEV_DB_PORT=1433
 *   DEV_DB_DATABASE=CA
 *   DEV_DB_USER=sa
 *   DEV_DB_PASSWORD=TuContraseña
 *   DEV_DB_SCHEMA=dbo       (opcional, default: dbo)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const sql = require('mssql');

const REPO_ROOT = path.join(__dirname, '..');
const SQL_DIR = path.join(REPO_ROOT, 'SQL');
const PROCS_DIR = path.join(SQL_DIR, 'procedimientos');
const TABLES_DIR = path.join(SQL_DIR, 'tablas');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Leer credenciales: .env.dev → .env.deploy (fallback) ──────────────────
function loadEnvDev() {
    // Buscar en orden: .env.dev primero, .env.deploy como alternativa
    const candidates = [
        path.join(REPO_ROOT, '.env.dev'),
        path.join(REPO_ROOT, '.env.deploy'),
    ];

    let cfg = null;
    let foundFile = null;

    for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
            const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
            const parsed = {};
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const idx = trimmed.indexOf('=');
                if (idx === -1) continue;
                parsed[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
            }
            // Usar este archivo solo si tiene las variables de BD necesarias
            if (parsed.DEV_DB_SERVER && parsed.DEV_DB_DATABASE && parsed.DEV_DB_USER && parsed.DEV_DB_PASSWORD) {
                cfg = parsed;
                foundFile = filePath;
                break;
            }
        }
    }

    if (!cfg) {
        console.error('');
        console.error('❌ No se encontraron credenciales de BD de desarrollo.');
        console.error('');
        console.error('   Agrega estas variables a tu .env.deploy (o crea .env.dev):');
        console.error('');
        console.error('   DEV_DB_SERVER=localhost');
        console.error('   DEV_DB_PORT=1433');
        console.error('   DEV_DB_DATABASE=CA');
        console.error('   DEV_DB_USER=sa');
        console.error('   DEV_DB_PASSWORD=TuContraseña');
        console.error('');
        process.exit(1);
    }

    console.log(`ℹ️  Usando credenciales de: ${path.basename(foundFile)}`);
    return cfg;
}

// ── Leer versión actual del proyecto ──────────────────────────────────────
function readProjectVersion() {
    try {
        const ctx = path.join(REPO_ROOT, 'CONTROL-DE-ASISTENCIA', 'src', 'features', 'auth', 'AuthContext.tsx');
        if (!fs.existsSync(ctx)) return '0.0.0';
        const m = fs.readFileSync(ctx, 'utf8').match(/APP_DATA_VERSION\s*=\s*['"]([\d.]+)['"]/);
        return m ? m[1] : '0.0.0';
    } catch { return '0.0.0'; }
}

// ── Encabezado profesional para un archivo SQL ────────────────────────────
function buildHeader({ type, name, schema, databaseName, version, exportedAt }) {
    const typeLabel = type === 'procedure' ? 'Stored Procedure' : 'Tabla';
    const line = '-- ' + '─'.repeat(70);
    return [
        line,
        `-- ${typeLabel}: [${schema}].[${name}]`,
        `-- Base de Datos:       ${databaseName}`,
        `-- Versión de Paquete:  v${version}`,
        `-- Compilado:           ${exportedAt}`,
        `-- Sistema:             CA3 Control de Asistencia`,
        line,
        '',
    ].join('\n');
}

// ── Limpiar definición del objeto (normalizar GO) ─────────────────────────
function normalizeSQL(definition) {
    // Asegurar que termina con GO
    const trimmed = definition.trim();
    return trimmed.endsWith('\nGO') || trimmed.toUpperCase().endsWith('\nGO')
        ? trimmed
        : trimmed + '\nGO';
}

// ── Exportar SPs ──────────────────────────────────────────────────────────
async function exportProcedures(pool, cfg, meta) {
    const { excluded } = loadExclusions();

    const res = await pool.request().query(`
    SELECT
      s.name          AS SchemaName,
      o.name          AS ProcName,
      m.definition    AS Definition
    FROM sys.objects o
    JOIN sys.schemas s ON s.schema_id = o.schema_id
    JOIN sys.sql_modules m ON m.object_id = o.object_id
    WHERE o.type IN ('P', 'PC')       -- P = procedimiento, PC = procedimiento CLR
      AND o.is_ms_shipped = 0
    ORDER BY s.name, o.name
  `);

    const procs = res.recordset;
    let exported = 0, skipped = 0;

    if (!DRY_RUN) {
        fs.mkdirSync(PROCS_DIR, { recursive: true });
    }

    for (const proc of procs) {
        const fullName = `${proc.SchemaName}.${proc.ProcName}`;
        if (excluded.includes(fullName)) {
            console.log(`  ⏭️  Excluido: ${fullName}`);
            skipped++;
            continue;
        }

        const header = buildHeader({
            type: 'procedure',
            name: proc.ProcName,
            schema: proc.SchemaName,
            databaseName: cfg.DEV_DB_DATABASE,
            version: meta.version,
            exportedAt: meta.exportedAt,
        });

        // Forzar CREATE OR ALTER para que sea idempotente
        const definition = header + '\n' + forceCreateOrAlter(normalizeSQL(proc.Definition));

        const fileName = `${proc.SchemaName}.${proc.ProcName}.sql`;
        const filePath = path.join(PROCS_DIR, fileName);

        if (!DRY_RUN) {
            fs.writeFileSync(filePath, definition, 'utf8');
        }
        console.log(`  ✅ SP exportado: ${fullName}`);
        exported++;
    }

    return { exported, skipped, total: procs.length };
}

// ── Exportar Tablas ───────────────────────────────────────────────────────
async function exportTables(pool, cfg, meta) {
    // Obtener todas las tablas de usuario
    const tablesRes = await pool.request().query(`
    SELECT
      s.name  AS SchemaName,
      t.name  AS TableName
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE t.is_ms_shipped = 0
    ORDER BY s.name, t.name
  `);

    const tables = tablesRes.recordset;
    let exported = 0;

    if (!DRY_RUN) {
        fs.mkdirSync(TABLES_DIR, { recursive: true });
    }

    for (const tbl of tables) {
        // Obtener columnas
        const colsRes = await pool.request()
            .input('schema', sql.NVarChar, tbl.SchemaName)
            .input('table', sql.NVarChar, tbl.TableName)
            .query(`
        SELECT
          c.name                                                   AS ColName,
          tp.name                                                  AS TypeName,
          c.max_length,
          c.precision,
          c.scale,
          c.is_nullable,
          c.is_identity,
          OBJECT_DEFINITION(c.default_object_id)                  AS DefaultDef,
          dc.name                                                  AS DefaultName,
          pk.ConstraintName                                        AS PkConstraint
        FROM sys.columns c
        JOIN sys.types tp ON tp.user_type_id = c.user_type_id
        JOIN sys.tables  t ON t.object_id  = c.object_id
        JOIN sys.schemas s ON s.schema_id  = t.schema_id
        LEFT JOIN sys.default_constraints dc ON dc.object_id    = c.default_object_id
        LEFT JOIN (
          SELECT ic.column_id, i.name AS ConstraintName, i.object_id
          FROM sys.indexes i
          JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
          WHERE i.is_primary_key = 1
        ) pk ON pk.object_id = c.object_id AND pk.column_id = c.column_id
        WHERE t.name = @table AND s.name = @schema
        ORDER BY c.column_id
      `);

        const pkCols = await pool.request()
            .input('schema', sql.NVarChar, tbl.SchemaName)
            .input('table', sql.NVarChar, tbl.TableName)
            .query(`
        SELECT c.name AS ColName, i.name AS PkName
        FROM sys.indexes i
        JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
        JOIN sys.tables t ON t.object_id = i.object_id
        JOIN sys.schemas s ON s.schema_id = t.schema_id
        WHERE i.is_primary_key = 1 AND t.name = @table AND s.name = @schema
      `);

        const pkColNames = pkCols.recordset.map(r => r.ColName);
        const pkName = pkCols.recordset.length > 0 ? pkCols.recordset[0].PkName : null;
        const cols = colsRes.recordset;

        let colDefs = cols.map(col => {
            let typeDef = formatType(col);
            let nullDef = col.is_nullable ? 'NULL' : 'NOT NULL';
            let identity = col.is_identity ? ' IDENTITY(1,1)' : '';
            let def = '';
            if (col.DefaultDef) {
                const constraintPart = col.DefaultName ? `CONSTRAINT [${col.DefaultName}] ` : '';
                def = ` ${constraintPart}DEFAULT ${col.DefaultDef}`;
            }
            return `    [${col.ColName}] ${typeDef}${identity} ${nullDef}${def}`;
        });

        if (pkColNames.length > 0 && pkName) {
            const pkColList = pkColNames.map(c => `[${c}]`).join(', ');
            colDefs.push(`    CONSTRAINT [${pkName}] PRIMARY KEY CLUSTERED (${pkColList})`);
        }

        const header = buildHeader({
            type: 'table',
            name: tbl.TableName,
            schema: tbl.SchemaName,
            databaseName: cfg.DEV_DB_DATABASE,
            version: meta.version,
            exportedAt: meta.exportedAt,
        });

        const createSQL = [
            header,
            `IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name='${tbl.TableName}' AND schema_id=SCHEMA_ID('${tbl.SchemaName}'))`,
            `BEGIN`,
            `    CREATE TABLE [${tbl.SchemaName}].[${tbl.TableName}] (`,
            colDefs.join(',\n'),
            `    );`,
            `END`,
            `GO`,
        ].join('\n');

        const fileName = `${tbl.SchemaName}.${tbl.TableName}.sql`;
        const filePath = path.join(TABLES_DIR, fileName);

        if (!DRY_RUN) {
            fs.writeFileSync(filePath, createSQL, 'utf8');
        }
        console.log(`  ✅ Tabla exportada: ${tbl.SchemaName}.${tbl.TableName}`);
        exported++;
    }

    return { exported, total: tables.length };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatType(col) {
    const t = col.TypeName.toLowerCase();
    if (['nvarchar', 'varchar', 'char', 'nchar', 'binary', 'varbinary'].includes(t)) {
        const len = col.max_length === -1 ? 'MAX' : (t.startsWith('n') ? col.max_length / 2 : col.max_length);
        return `${col.TypeName}(${len})`;
    }
    if (['decimal', 'numeric'].includes(t)) {
        return `${col.TypeName}(${col.precision}, ${col.scale})`;
    }
    return col.TypeName;
}

function forceCreateOrAlter(sqlText) {
    return sqlText
        .replace(/\bCREATE\s+OR\s+ALTER\s+PROC(EDURE)?\b/gi, 'CREATE OR ALTER PROCEDURE')
        .replace(/\bALTER\s+PROC(EDURE)?\b/gi, 'CREATE OR ALTER PROCEDURE')
        .replace(/\bCREATE\s+PROC(EDURE)?\b/gi, 'CREATE OR ALTER PROCEDURE');
}

function loadExclusions() {
    const candidates = [
        path.join(REPO_ROOT, 'scripts', 'sp-exclusions.json'),
        path.join(REPO_ROOT, 'database', 'sp-exclusions.json'),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) {
            try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { }
        }
    }
    return { excluded: [] };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n🔄 CA3 — Exportador de SQL (BD de Desarrollo → Proyecto)\n');

    if (DRY_RUN) {
        console.log('⚠️  MODO DRY-RUN: solo se mostrarán los objetos, NO se escribirán archivos.\n');
    }

    const cfg = loadEnvDev();
    const version = readProjectVersion();
    const exportedAt = new Date().toLocaleString('es-MX', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
    });
    const meta = { version, exportedAt };

    const sqlCfg = {
        server: cfg.DEV_DB_SERVER,
        database: cfg.DEV_DB_DATABASE,
        user: cfg.DEV_DB_USER,
        password: cfg.DEV_DB_PASSWORD,
        port: parseInt(cfg.DEV_DB_PORT) || 1433,
        options: { trustServerCertificate: true, encrypt: false },
        connectionTimeout: 15000,
        requestTimeout: 60000,
    };

    let pool;
    try {
        console.log(`🔌 Conectando a ${cfg.DEV_DB_SERVER}/${cfg.DEV_DB_DATABASE}...`);
        pool = await sql.connect(sqlCfg);
        console.log('✅ Conexión exitosa.\n');

        console.log('📋 Exportando procedimientos almacenados...');
        const spResult = await exportProcedures(pool, cfg, meta);
        console.log(`   → ${spResult.exported} exportados, ${spResult.skipped} excluidos (de ${spResult.total} total)\n`);

        console.log('🗄️  Exportando tablas...');
        const tblResult = await exportTables(pool, cfg, meta);
        console.log(`   → ${tblResult.exported} exportadas (de ${tblResult.total} total)\n`);

        await pool.close();

        if (!DRY_RUN) {
            console.log('✅ Exportación completa.');
            console.log(`   SPs   → ${PROCS_DIR}`);
            console.log(`   Tablas → ${TABLES_DIR}`);
        }
        console.log('');
    } catch (err) {
        if (pool) { try { await pool.close(); } catch (_) { } }
        console.error(`\n❌ Error durante la exportación: ${err.message}\n`);
        process.exit(1);
    }
}

main();
