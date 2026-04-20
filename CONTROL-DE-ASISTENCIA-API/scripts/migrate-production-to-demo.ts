import sql from 'mssql';
import { faker } from '@faker-js/faker/locale/es_MX';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const LOCAL_IMAGES = [
    'C:/Users/SISTEMAS/.gemini/antigravity/brain/050698e2-6049-42ad-933f-e008bb221193/employee_man_1_1776725982277.png',
    'C:/Users/SISTEMAS/.gemini/antigravity/brain/050698e2-6049-42ad-933f-e008bb221193/employee_woman_1_1776725995845.png',
    'C:/Users/SISTEMAS/.gemini/antigravity/brain/050698e2-6049-42ad-933f-e008bb221193/employee_man_2_1776726010909.png',
    'C:/Users/SISTEMAS/.gemini/antigravity/brain/050698e2-6049-42ad-933f-e008bb221193/employee_woman_2_1776726065002.png'
];

// Load environment variables for local DB
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const localDbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '127.0.0.1',
    database: process.env.DB_DATABASE || 'CA',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

const demoDbConfig = {
    user: 'db_ac7ea1_ca_admin',
    password: '1q2w3e4r',
    server: 'SQL5110.site4now.net',
    database: 'db_ac7ea1_ca',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

const EXACT_TABLES = [
    'CatalogoConceptosNomina',
    'CatalogoEstatusAsistencia',
    'CatalogoHorarios',
    'CatalogoHorariosDetalle',
    'CatalogoNivelesAutorizacion',
    'CatalogoProcesosAutomaticos',
    'CatalogoReglasVacaciones',
    'CatalogoTiposIncidencia',
    'ConfiguracionIncidencias',
    'Dispositivos',
    'Roles',
    'RolesPermisos',
    'SISConfiguracion',
    'SISPermisos',
    'SISTiposCalculo',
    'SISTiposEventoCalendario',
    'Zonas'
];

const MOCKED_CATALOGS = [
    'CatalogoGruposNomina',
    'CatalogoDepartamentos',
    'CatalogoEstablecimientos',
    'CatalogoPuestos'
];

async function runMigration() {
    let localPool;
    let demoPool;
    try {
        console.log('🔌 Connecting to local DB...');
        localPool = await sql.connect(localDbConfig);

        console.log('🔌 Connecting to demo DB...');
        demoPool = await new sql.ConnectionPool(demoDbConfig).connect();

        console.log('🛡️ Disabling foreign keys in Demo DB...');
        try {
            await demoPool.request().query('EXEC sp_msforeachtable "ALTER TABLE ? NOCHECK CONSTRAINT all"');
        } catch (err: any) {
            console.warn('⚠️ sp_msforeachtable failed, might not have permissions. Proceeding anyway...', err.message);
        }

        for (const tableName of EXACT_TABLES) {
            await migrateTable(localPool, demoPool, tableName, false);
        }

        for (const tableName of MOCKED_CATALOGS) {
            await migrateTable(localPool, demoPool, tableName, true);
        }

        console.log(`\n⏳ Migrating Empleados (Top 50 active)...`);
        try {
            await demoPool.request().query('DELETE FROM Empleados');
        } catch (err: any) {
            console.warn('Could not delete from Empleados:', err.message);
        }

        const empResult = await localPool.request().query(`SELECT TOP 50 * FROM Empleados WHERE Activo = 1`);
        const employees = empResult.recordset;

        const preloadedImages = LOCAL_IMAGES.map(p => fs.readFileSync(p));

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const isMale = faker.datatype.boolean();
            const sexType = isMale ? 'male' : 'female';

            const n = faker.person.firstName(sexType);
            const ap = faker.person.lastName(sexType);
            const am = faker.person.lastName(sexType);

            emp.Nombres = n;
            emp.ApellidoPaterno = ap;
            emp.ApellidoMaterno = am;
            emp.NombreCompleto = `${n} ${ap} ${am}`;

            emp.NSS = faker.string.numeric(11);
            emp.CURP = faker.string.alphanumeric({ length: 18, casing: 'upper' });
            emp.RFC = faker.string.alphanumeric({ length: 13, casing: 'upper' });
            emp.CodRef = `${(i + 1).toString().padStart(4, '0')}`;
            emp.FechaNacimiento = faker.date.birthdate({ min: 18, max: 65, mode: 'age' });
            emp.Sexo = isMale ? 'H' : 'M';

            try {
                const possibleOptions = isMale ? [0, 2] : [1, 3];
                const randChoice = possibleOptions[Math.floor(Math.random() * possibleOptions.length)];
                emp.Imagen = preloadedImages[randChoice];
                console.log(`     📸 Assigned Nano Banana photo for ${emp.NombreCompleto}`);
            } catch (err) {
                console.warn(`     ⚠️ Failed to map photo for ${emp.NombreCompleto}`, err);
                // null is handled
            }
        }

        await insertIntoDemo(demoPool, 'Empleados', employees);

        console.log('🛡️ Enabling foreign keys in Demo DB...');
        try {
            await demoPool.request().query('EXEC sp_msforeachtable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all"');
        } catch (err: any) {
            console.warn('⚠️ Failed to re-enable constraints.', err.message);
        }

        console.log('✅ Migration complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

async function migrateTable(localPool: sql.ConnectionPool, demoPool: sql.ConnectionPool, tableName: string, mock: boolean) {
    console.log(`\n⏳ Migrating table ${tableName}... (mock=${mock})`);

    try {
        await demoPool.request().query(`DELETE FROM ${tableName}`);
    } catch (err: any) {
        console.warn(`Could not delete from ${tableName}:`, err.message);
    }

    const result = await localPool.request().query(`SELECT * FROM ${tableName}`);
    let rows: any[] = result.recordset;

    if (mock) {
        // Filter out inactive catalogs unless they are actively used by the 50 employees being migrated
        if (tableName === 'CatalogoDepartamentos') {
            const inUse = await localPool.request().query(`SELECT DISTINCT DepartamentoId FROM Empleados WHERE Activo = 1`);
            const usedIds = new Set(inUse.recordset.map(r => r.DepartamentoId));
            rows = rows.filter(r => r.Activo || usedIds.has(r.DepartamentoId));
        } else if (tableName === 'CatalogoEstablecimientos') {
            const inUse = await localPool.request().query(`SELECT DISTINCT EstablecimientoId FROM Empleados WHERE Activo = 1`);
            const usedIds = new Set(inUse.recordset.map(r => r.EstablecimientoId));
            rows = rows.filter(r => r.Activo || usedIds.has(r.EstablecimientoId));
        } else if (tableName === 'CatalogoPuestos') {
            const inUse = await localPool.request().query(`SELECT DISTINCT PuestoId FROM Empleados WHERE Activo = 1`);
            const usedIds = new Set(inUse.recordset.map(r => r.PuestoId));
            rows = rows.filter(r => r.Activo || usedIds.has(r.PuestoId));
        }

        rows.forEach((row, idx) => {
            if (tableName === 'CatalogoDepartamentos') {
                row.Nombre = faker.commerce.department();
                row.Abreviatura = row.Nombre.substring(0, 3).toUpperCase();
            } else if (tableName === 'CatalogoEstablecimientos') {
                row.Nombre = faker.company.name();
                row.Abreviatura = row.Nombre.substring(0, 3).toUpperCase();
            } else if (tableName === 'CatalogoPuestos') {
                row.Nombre = faker.person.jobTitle();
            } else if (tableName === 'CatalogoGruposNomina') {
                row.Nombre = `GN ${faker.commerce.department()}`;
                if (row.Abreviatura) row.Abreviatura = row.Nombre.substring(3, 6).toUpperCase();
            }
            if (row.CodRef) {
                row.CodRef = `${tableName.substring(8, 11).toUpperCase()}-${idx}`;
            }
        });
    }

    await insertIntoDemo(demoPool, tableName, rows);
}

async function insertIntoDemo(demoPool: sql.ConnectionPool, tableName: string, rows: any[]) {
    if (rows.length === 0) {
        console.log(`   - 0 rows to insert.`);
        return;
    }

    const colResult = await demoPool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
    `);

    if (colResult.recordset.length === 0) {
        console.warn(`   ⚠️ Table ${tableName} does not exist in demo DB! Skipping...`);
        return;
    }

    const columnsInTarget = colResult.recordset.map(c => c.COLUMN_NAME);

    console.log(`   + Inserting ${rows.length} rows into ${tableName} (falling back to raw inserts)...`);
    await doRawInsert(demoPool, tableName, columnsInTarget, rows);
}

async function doRawInsert(pool: sql.ConnectionPool, tableName: string, cols: string[], rows: any[]) {
    const idRes = await pool.request().query(`SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('${tableName}')`);
    const hasIdentity = idRes.recordset.length > 0;

    let preSql = '';
    let startSql = '';
    if (hasIdentity) startSql += ` SET IDENTITY_INSERT ${tableName} ON;`;

    let postSql = hasIdentity ? ` SET IDENTITY_INSERT ${tableName} OFF;` : '';

    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        let valuesLines = [];
        for (let j = 0; j < chunk.length; j++) {
            const row = chunk[j];
            const vals = cols.map(c => {
                const val = row[c];
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'boolean') return val ? '1' : '0';
                if (typeof val === 'number') return val.toString();
                if (val instanceof Date) {
                    return `'${val.toISOString()}'`;
                }
                if (Buffer.isBuffer(val)) {
                    return `0x${val.toString('hex')}`;
                }
                const escaped = val.toString().replace(/'/g, "''");
                return `N'${escaped}'`;
            });
            valuesLines.push(`(${vals.join(', ')})`);
        }

        const q = `${startSql} INSERT INTO ${tableName} (${cols.join(', ')}) VALUES ${valuesLines.join(', ')}; ${postSql}`;

        try {
            await pool.request().query(q);
        } catch (e: any) {
            console.error(`     ❌ Chunk insert failed for ${tableName}:`, e.message);
        }
    }
}

runMigration();
