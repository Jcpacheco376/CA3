const fs = require('fs');
const path = require('path');
const mssql = require('mssql');

async function seedDatabase(dbConfig, baseDir, log) {
    const pkgRoot = fs.existsSync(path.join(baseDir, 'database')) ? baseDir : path.join(baseDir, '..');

    const config = {
        user: dbConfig.DB_USER,
        password: dbConfig.DB_PASSWORD,
        server: dbConfig.DB_SERVER,
        database: dbConfig.DB_DATABASE,
        port: parseInt(dbConfig.DB_PORT || '1433'),
        options: {
            encrypt: false,
            trustServerCertificate: true,
            requestTimeout: 60000
        }
    };

    const seedsDir = path.join(pkgRoot, 'database', 'seeds');
    if (!fs.existsSync(seedsDir)) {
        log('No se encontraron archivos semilla (seeds). Saltando seeder.');
        return;
    }

    // Clasificación de tablas
    const TYPE_A = [ // Upsert/Insert si falta
        { table: 'SISConfiguracion', pk: 'ConfigId' },
        { table: 'SISPermisos', pk: 'PermisoId' },
        { table: 'SISTiposCalculo', pk: 'TipoCalculoId' },
        { table: 'SISTiposEventoCalendario', pk: 'TipoEventoId' }
    ];

    const TYPE_B = [ // Insertar solo si la tabla está totalmente vacía
        'CatalogoEstatusAsistencia',
        'CatalogoNivelesAutorizacion',
        'CatalogoReglasVacaciones',
        'CatalogoTiposIncidencia',
        'ConfiguracionIncidencias',
        'Roles',
        'VacacionesAprobadoresConfig'
    ];

    let pool;
    try {
        pool = await mssql.connect(config);

        // Helper para checar IDENTITY
        const hasIdentity = async (tableName) => {
            const res = await pool.request().query(`SELECT OBJECTPROPERTY(OBJECT_ID('${tableName}'), 'TableHasIdentity') AS hasIdentity`);
            return res.recordset[0].hasIdentity === 1;
        };

        // Helper para procesar fechas u strings en SQL
        const formatValue = (val) => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            // Si parece fecha ISO
            if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                return `'${val.replace('T', ' ').replace('Z', '')}'`;
            }
            // Escapar comillas simples
            return `'${String(val).replace(/'/g, "''")}'`;
        };

        const generateInsert = (tableName, row) => {
            const cols = Object.keys(row).map(c => `[${c}]`).join(', ');
            const vals = Object.values(row).map(formatValue).join(', ');
            return `INSERT INTO [${tableName}] (${cols}) VALUES (${vals});`;
        };

        log('\n--- 📥 Iniciando Siembra de Datos (Data Seeding) ---');

        // Procesar TIPO A
        for (const tp of TYPE_A) {
            const file = path.join(seedsDir, `${tp.table}.json`);
            if (!fs.existsSync(file)) continue;

            const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (!rows.length) continue;

            log(`   ↳ Verificando configuración clave: [${tp.table}] (${rows.length} registros)...`);
            const identity = await hasIdentity(tp.table);

            let inserted = 0;
            for (const row of rows) {
                const pkValue = row[tp.pk];
                const checkSql = `SELECT 1 AS ext FROM [${tp.table}] WHERE [${tp.pk}] = ${formatValue(pkValue)}`;
                const checkRes = await pool.request().query(checkSql);

                if (checkRes.recordset.length === 0) {
                    let insertSql = '';
                    if (identity) insertSql += `SET IDENTITY_INSERT [${tp.table}] ON;\n`;
                    insertSql += generateInsert(tp.table, row) + '\n';
                    if (identity) insertSql += `SET IDENTITY_INSERT [${tp.table}] OFF;`;

                    try {
                        await pool.request().query(insertSql);
                        inserted++;
                    } catch (e) {
                        log(`     ⚠️ Error insertando ${tp.pk}=${pkValue} en ${tp.table}: ${e.message}`);
                    }
                }
            }
            if (inserted > 0) log(`     ✅ ${inserted} registros insertados. (Se omitieron los ya existentes)`);
        }

        // Procesar TIPO B
        for (const tableName of TYPE_B) {
            const file = path.join(seedsDir, `${tableName}.json`);
            if (!fs.existsSync(file)) continue;

            const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (!rows.length) continue;

            log(`   ↳ Verificando catálogo: [${tableName}]...`);

            // Checar si está vacía
            const countRes = await pool.request().query(`SELECT COUNT(*) as c FROM [${tableName}]`);
            if (countRes.recordset[0].c > 0) {
                log(`     ⏭️  Omitido (La tabla ya contiene datos del usuario).`);
                continue;
            }

            const identity = await hasIdentity(tableName);

            let batchSql = '';
            if (identity) batchSql += `SET IDENTITY_INSERT [${tableName}] ON;\n`;
            for (const row of rows) {
                batchSql += generateInsert(tableName, row) + '\n';
            }
            if (identity) batchSql += `SET IDENTITY_INSERT [${tableName}] OFF;`;

            try {
                // Al ser varios inserts, es mejor ejecutar en bloque (el batch no debe exceder límite si las seeds son cortas, max ~100 rows aquí)
                await pool.request().query(batchSql);
                log(`     ✅ Catálogo inicializado con ${rows.length} registros default.`);
            } catch (e) {
                log(`     ⚠️ Error poblando ${tableName}: ${e.message}`);
            }
        }

        // ── Procesar TIPO C: Asignaciones de permisos a Roles (Idempotente por nombre) ────────
        // Lee SISRolesPermisos_defaults.json y asigna permisos a roles por nombre.
        // Se ejecuta en CADA instalación/actualización para garantizar que permisos nuevos queden asignados.
        const rolesPermisosFile = path.join(seedsDir, 'SISRolesPermisos_defaults.json');
        if (fs.existsSync(rolesPermisosFile)) {
            const assignments = JSON.parse(fs.readFileSync(rolesPermisosFile, 'utf8'));
            if (assignments.length > 0) {
                log(`   ↳ Verificando asignaciones de permisos a roles (${assignments.length} reglas)...`);
                let assignedCount = 0;
                for (const a of assignments) {
                    try {
                        const result = await pool.request().query(`
                            DECLARE @RolId INT  = (SELECT TOP 1 RolId FROM SISRoles WHERE NombreRol = '${a.RolNombre.replace(/'/g, "''")}');
                            DECLARE @PermId INT = (SELECT TOP 1 PermisoId FROM SISPermisos WHERE NombrePermiso = '${a.PermisoNombre.replace(/'/g, "''")}');
                            IF @RolId IS NOT NULL AND @PermId IS NOT NULL
                               AND NOT EXISTS (SELECT 1 FROM SISRolesPermisos WHERE RolId = @RolId AND PermisoId = @PermId)
                            BEGIN
                               INSERT INTO SISRolesPermisos (RolId, PermisoId) VALUES (@RolId, @PermId);
                               SELECT 1 AS inserted;
                            END
                            ELSE SELECT 0 AS inserted;
                        `);
                        if (result.recordset[0]?.inserted === 1) assignedCount++;
                    } catch (e) {
                        log(`     ⚠️ Error asignando ${a.PermisoNombre} a ${a.RolNombre}: ${e.message}`);
                    }
                }
                if (assignedCount > 0)
                    log(`     ✅ ${assignedCount} asignaciones de permisos nuevas aplicadas.`);
                else
                    log(`     ⏭️  Asignaciones de permisos ya al corriente.`);
            }
        }

        log('--- 📥 Siembra de Datos Completada ---');

    } catch (err) {
        log(`\n❌ Error en Data Seeding: ${err.message}`);
    } finally {
        if (pool) await pool.close();
    }
}

module.exports = { seedDatabase };
