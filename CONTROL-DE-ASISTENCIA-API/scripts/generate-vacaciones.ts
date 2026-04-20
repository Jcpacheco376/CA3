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
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; // Date only for DATE columns
}

function localSqlDateTime(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function generateVacaciones() {
    let demoPool: sql.ConnectionPool;
    try {
        console.log('🔌 Connecting to Demo DB...');
        demoPool = await new sql.ConnectionPool(demoDbConfig).connect();

        console.log('🗑️ Cleaning up existing Vacation Tables...');
        await demoPool.request().query('DELETE FROM VacacionesSaldosDetalle');
        await demoPool.request().query('DELETE FROM SolicitudesVacacionesFirmas');
        await demoPool.request().query('DELETE FROM SolicitudesVacaciones');
        await demoPool.request().query('DELETE FROM VacacionesSaldos');

        // Fetch Employees
        const empResult = await demoPool.request().query('SELECT EmpleadoId FROM Empleados');
        const employees = empResult.recordset;

        const saldosToInsert: any[] = [];
        const solicitudesToInsert: any[] = [];
        const detallesToInsert: any[] = [];

        let solicitudCounter = 1;
        let detalleCounter = 1;

        console.log(`⏳ Generating base Saldo for ${employees.length} employees...`);

        // Generate base Saldo for all
        for (let i = 0; i < employees.length; i++) {
            const empId = employees[i].EmpleadoId;
            const saldoId = i + 1;

            const diasOtorgados = 12 + Math.floor(Math.random() * 6); // 12 to 18

            const saldo = {
                SaldoId: saldoId,
                EmpleadoId: empId,
                Anio: 2026,
                DiasOtorgados: diasOtorgados,
                DiasDisfrutados: 0,
                FechaInicioPeriodo: new Date(2026, 0, 1),
                FechaFinPeriodo: new Date(2026, 11, 31)
            };

            saldosToInsert.push(saldo);
        }

        // Generate Solicitudes for ~12 employees (random sub-selection)
        const selectedEmployees = [...employees].sort(() => 0.5 - Math.random()).slice(0, 12);

        console.log(`⏳ Generating assorted Time-Off requests for 12 employees...`);

        for (let i = 0; i < selectedEmployees.length; i++) {
            const empId = selectedEmployees[i].EmpleadoId;
            const saldoObj = saldosToInsert.find(s => s.EmpleadoId === empId);

            // Determine status based on iteration index distribution: 
            // First 6: Aprobada, next 4: Pendiente, last 2: Rechazada
            let estatus = 'Aprobada';
            let startDate = new Date();
            let endDate = new Date();
            let diasSolicitados = 0;

            if (i < 6) {
                estatus = 'Aprobada';
                // Past vacation
                startDate = new Date(2026, 2, 5 + i); // Sometime in March
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 3);
                diasSolicitados = 4;
            } else if (i < 10) {
                estatus = 'Pendiente';
                // Future vacation
                startDate = new Date(2026, 4, 10 + i); // Sometime in May
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 1);
                diasSolicitados = 2;
            } else {
                estatus = 'Cancelada'; // or Rechazada depending on sys, Cancelada is safe fallback
                startDate = new Date(2026, 1, 15);
                endDate = new Date(2026, 1, 16);
                diasSolicitados = 2;
            }

            const solicitudId = solicitudCounter++;

            solicitudesToInsert.push({
                SolicitudId: solicitudId,
                EmpleadoId: empId,
                FechaInicio: startDate,
                FechaFin: endDate,
                DiasSolicitados: diasSolicitados,
                Comentarios: `Simulación Demo - ${estatus}`,
                Estatus: estatus,
                UsuarioAutorizoId: estatus === 'Aprobada' ? 1 : null,
                FechaSolicitud: new Date(startDate.getTime() - (86400000 * 5)), // 5 days before
                FechaRespuesta: estatus !== 'Pendiente' ? new Date(startDate.getTime() - (86400000 * 3)) : null,
                UsuarioSolicitanteId: empId,
                DiasNaturales: diasSolicitados,
                DiasFeriados: 0,
                DiasDescanso: 0
            });

            // If Approved, create detailed consumption deductions
            if (estatus === 'Aprobada') {
                saldoObj.DiasDisfrutados += diasSolicitados;

                for (let d = 0; d < diasSolicitados; d++) {
                    const consumedDate = new Date(startDate);
                    consumedDate.setDate(startDate.getDate() + d);

                    detallesToInsert.push({
                        DetalleId: detalleCounter++,
                        SaldoId: saldoObj.SaldoId,
                        Fecha: consumedDate,
                        Dias: 1,
                        Descripcion: `Consumo Folio #${solicitudId}`,
                        FechaRegistro: new Date(),
                        Tipo: 'GOCE'
                    });
                }
            }
        }

        console.log(`📦 Bulk inserting Saldos...`);
        await doRawInsert(demoPool, 'VacacionesSaldos',
            ['SaldoId', 'EmpleadoId', 'Anio', 'DiasOtorgados', 'DiasDisfrutados', 'FechaInicioPeriodo', 'FechaFinPeriodo'],
            saldosToInsert);

        console.log(`📦 Bulk inserting Solicitudes...`);
        await doRawInsert(demoPool, 'SolicitudesVacaciones',
            ['SolicitudId', 'EmpleadoId', 'FechaInicio', 'FechaFin', 'DiasSolicitados', 'Comentarios', 'Estatus', 'UsuarioAutorizoId', 'FechaSolicitud', 'FechaRespuesta', 'UsuarioSolicitanteId', 'DiasNaturales', 'DiasFeriados', 'DiasDescanso'],
            solicitudesToInsert);

        console.log(`📦 Bulk inserting Detalles de Consumo...`);
        await doRawInsert(demoPool, 'VacacionesSaldosDetalle',
            ['DetalleId', 'SaldoId', 'Fecha', 'Dias', 'Descripcion', 'FechaRegistro', 'Tipo'],
            detallesToInsert);

        console.log(`✅ Vacations generation successfully completed!`);
        process.exit(0);

    } catch (err) {
        console.error('❌ Vacation Generator failed:', err);
        process.exit(1);
    }
}

async function doRawInsert(pool: sql.ConnectionPool, tableName: string, cols: string[], rows: any[]) {
    if (rows.length === 0) return;

    const idRes = await pool.request().query(`SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('${tableName}')`);
    const hasIdentity = idRes.recordset.length > 0;

    let preSql = '';
    let startSql = '';
    if (hasIdentity) startSql += ` SET IDENTITY_INSERT ${tableName} ON;`;
    let postSql = hasIdentity ? ` SET IDENTITY_INSERT ${tableName} OFF;` : '';

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
                    // For pure DATE vs DATETIME distinction
                    if (c.startsWith('Fecha') && !c.includes('Hora') && c !== 'FechaSolicitud' && c !== 'FechaRespuesta' && c !== 'FechaRegistro') {
                        return `'${localSqlDate(val)}'`;
                    }
                    return `'${localSqlDateTime(val)}'`;
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
            console.error(`     Query: ${q.substring(0, 200)}...`);
        }
    }
}

generateVacaciones();
