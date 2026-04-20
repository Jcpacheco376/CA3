import sql from 'mssql';

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

function localSqlDate(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function generateChecadas() {
    let demoPool: sql.ConnectionPool;
    try {
        console.log('🔌 Connecting to Demo DB...');
        demoPool = await new sql.ConnectionPool(demoDbConfig).connect();

        console.log('🗑️ Cleaning up existing Checadas in Demo DB...');
        await demoPool.request().query('DELETE FROM Checadas');

        // Fetch Employees
        const empResult = await demoPool.request().query('SELECT EmpleadoId, HorarioIdPredeterminado FROM Empleados');
        const employees = empResult.recordset;

        // Fetch Schedule Definitions
        const horResult = await demoPool.request().query('SELECT * FROM CatalogoHorariosDetalle');
        const horariosDetalle = horResult.recordset;

        // Group by HorarioId
        const schedules: Record<number, any[]> = {};
        for (const hd of horariosDetalle) {
            if (!schedules[hd.HorarioId]) schedules[hd.HorarioId] = [];
            schedules[hd.HorarioId].push(hd);
        }

        console.log(`⏳ Generating attendance for ${employees.length} employees over the last 30 days...`);

        const rowsToInsert: any[] = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const emp of employees) {
            const hId = emp.HorarioIdPredeterminado;
            if (!hId || !schedules[hId]) continue; // No schedule assigned

            // Iterate last 30 days
            for (let i = 30; i >= 1; i--) {
                const iterDate = new Date(today);
                iterDate.setDate(iterDate.getDate() - i);

                // Map JS getDay (0=Sun, 6=Sat) to typical 1=Mon, 7=Sun
                let jsDay = iterDate.getDay();
                let sqlDay = jsDay === 0 ? 7 : jsDay;

                const dayConfig = schedules[hId].find(d => d.DiaSemana === sqlDay);

                // Active work day check
                if (dayConfig && dayConfig.EsDiaLaboral) {

                    // Add realism and chaos factors
                    const randChaos = Math.random();
                    if (randChaos < 0.05) {
                        // 5% chance of an outright absence (falta)
                        continue;
                    }

                    const skipEntrance = Math.random() < 0.03; // 3% chance missing entrance
                    const skipExit = Math.random() < 0.03; // 3% chance missing exit
                    const hasSevereDelay = Math.random() < 0.10; // 10% chance of 15+ min delay

                    // Entrance
                    if (dayConfig.HoraEntrada && !skipEntrance) {
                        const entraDate = applyTimeToDate(iterDate, dayConfig.HoraEntrada);

                        let entraVariance = Math.floor(Math.random() * 16) - 10; // Normal: -10 to +5
                        if (hasSevereDelay) {
                            entraVariance = 15 + Math.floor(Math.random() * 30); // Late: +15 to +45
                        }

                        entraDate.setMinutes(entraDate.getMinutes() + entraVariance);

                        rowsToInsert.push({
                            EmpleadoId: emp.EmpleadoId,
                            FechaHora: entraDate,
                            Checador: 'DEMO_DEVICE'
                        });
                    }

                    // Exit
                    if (dayConfig.HoraSalida && !skipExit) {
                        const salidaDate = applyTimeToDate(iterDate, dayConfig.HoraSalida);
                        // Variance: 0 to +15 minutes
                        const salidaVariance = Math.floor(Math.random() * 16);
                        salidaDate.setMinutes(salidaDate.getMinutes() + salidaVariance);

                        rowsToInsert.push({
                            EmpleadoId: emp.EmpleadoId,
                            FechaHora: salidaDate,
                            Checador: 'DEMO_DEVICE'
                        });
                    }
                }
            }
        }

        console.log(`📦 Synthesized ${rowsToInsert.length} punch records. Committing bulk insert...`);

        await doRawInsert(demoPool, 'Checadas', ['EmpleadoId', 'FechaHora', 'Checador'], rowsToInsert);

        console.log(`✅ Checadas generation successfully completed!`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Generator failed:', err);
        process.exit(1);
    }
}

// Convert native SQL time obj to a combined JS date wrapper
function applyTimeToDate(baseDate: Date, sqlTime: Date): Date {
    const d = new Date(baseDate);
    // tedious usually parses time to a Date locked at 1970-01-01 but correct UTC hours/mins, 
    // we extract getUTCHours/Minutes safely.
    d.setHours(sqlTime.getUTCHours(), sqlTime.getUTCMinutes(), sqlTime.getUTCSeconds(), 0);
    return d;
}

async function doRawInsert(pool: sql.ConnectionPool, tableName: string, cols: string[], rows: any[]) {
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);

        let valuesLines = [];
        for (let j = 0; j < chunk.length; j++) {
            const row = chunk[j];
            const vals = cols.map(c => {
                const val = row[c];
                if (val === null || val === undefined) return 'NULL';
                if (val instanceof Date) {
                    return `'${localSqlDate(val)}'`;
                }
                const escaped = val.toString().replace(/'/g, "''");
                return `N'${escaped}'`;
            });
            valuesLines.push(`(${vals.join(', ')})`);
        }

        const q = `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES ${valuesLines.join(', ')};`;

        try {
            await pool.request().query(q);
        } catch (e: any) {
            console.error(`     ❌ Chunk insert failed for ${tableName}:`, e.message);
        }
    }
}

generateChecadas();
