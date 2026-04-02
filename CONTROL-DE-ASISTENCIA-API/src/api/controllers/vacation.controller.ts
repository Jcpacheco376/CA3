import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const previewPeriod = async (req: any, res: Response) => {
    const { empleadoId } = req.params;
    const { fechaInicio, fechaFin } = req.query as { fechaInicio: string; fechaFin: string };
    const isOwn = parseInt(empleadoId as string) === req.user.empleadoId;

    if (!isOwn && !req.user.permissions['vacaciones.read'] && !req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }
    if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ message: 'fechaInicio y fechaFin son requeridos.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result: any = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .execute('sp_Vacaciones_PreviewPeriodo');

        // result.recordsets[0] contains the daily detail
        // result.recordsets[1] contains the summary summary
        res.json({
            days: result.recordsets ? result.recordsets[0] : [],
            summary: result.recordsets ? result.recordsets[1][0] : {}
        });
    } catch (err: any) {
        console.error('[previewPeriod] Error:', err);
        res.status(500).json({ message: 'Error al calcular preview del periodo.' });
    }
};

export const getBalance = async (req: any, res: Response) => {
    // Both read their own or manage all can see balances
    const { empleadoId } = req.params;
    const isOwn = parseInt(empleadoId as string) === req.user.empleadoId;

    if (!isOwn && !req.user.permissions['vacaciones.read'] && !req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }

    const { year } = req.query; // anniversary number or natural year

    try {
        const pool = await sql.connect(dbConfig);
        const dbName = dbConfig.database || 'unknown';
        let record: any = null;

        // Base query: Agnostica de Anio < 100 para soportar historial viejo y nuevo
        let baseQuery = `
            SELECT vs.*, 
            ISNULL((SELECT SUM(Dias) FROM VacacionesSaldosDetalle WHERE SaldoId = vs.SaldoId AND Tipo = 'Ajuste'), 0) as DiasAjuste,
            ISNULL((SELECT SUM(Dias) FROM VacacionesSaldosDetalle WHERE SaldoId = vs.SaldoId AND Tipo = 'Pagado'), 0) as DiasPagados
            FROM VacacionesSaldos vs 
            WHERE vs.EmpleadoId = @EmpleadoId
        `;

        if (year) {
            // Solicitud explícita de un periodo
            const r = await pool.request()
                .input('EmpleadoId', sql.Int, empleadoId)
                .input('Anio', sql.Int, year)
                .query(baseQuery + ' AND vs.Anio = @Anio');
            record = r.recordset[0] ?? null;
        } else {
            // Intento 1: periodo actual por fecha
            try {
                const r = await pool.request()
                    .input('EmpleadoId', sql.Int, empleadoId)
                    .query(baseQuery + ` AND GETDATE() BETWEEN vs.FechaInicioPeriodo AND vs.FechaFinPeriodo`);
                record = r.recordset[0] ?? null;
            } catch (dateErr: any) {
                console.warn('[getBalance] Error en query por fechas:', dateErr.message);
            }

            // Intento 2 (fallback): periodo más reciente (por Anio DESC)
            if (!record) {
                const r = await pool.request()
                    .input('EmpleadoId', sql.Int, empleadoId)
                    .query(baseQuery + ` ORDER BY vs.Anio DESC`);
                record = r.recordset[0] ?? null;
            }
        }

        if (record) {
            record.DiasRestantes = record.DiasRestantes || 0;
            res.setHeader('X-API-Version', `Antigravity-V4 [DB: ${dbName}]`);
            return res.json(record);
        }

        // Sin registros
        res.setHeader('X-API-Version', `Antigravity-V4 [DB: ${dbName}]`);
        return res.json({ EmpleadoId: parseInt(empleadoId as string), Anio: 0, DiasOtorgados: 0, DiasDisfrutados: 0, DiasAjuste: 0, DiasPagados: 0, DiasRestantes: 0 });
    } catch (err: any) {
        console.error('[getBalance] Fatal Error:', err);
        res.status(500).json({ message: err.message, stack: err.stack });
    }
};

export const getRequests = async (req: any, res: Response) => {
    const { empleadoId } = req.query; // Optional filter

    try {
        const pool = await sql.connect(dbConfig);
        const request = pool.request();

        request.input('UsuarioId', sql.Int, req.user.usuarioId);
        request.input('MiEmpleadoId', sql.Int, req.user.empleadoId || -1);

        let query = `
            WITH EmpleadosPermitidos AS (
                SELECT EmpleadoId FROM dbo.fn_Seguridad_GetEmpleadosPermitidos(@UsuarioId)
            )
            SELECT S.*, E.NombreCompleto, E.CodRef,
            (SELECT NombreCompleto FROM Usuarios WHERE UsuarioId = S.UsuarioSolicitanteId) as SolicitanteNombre,
            (SELECT NombreCompleto FROM Usuarios WHERE UsuarioId = S.UsuarioAutorizoId) as AutorizadorGeneral,
            (
                SELECT f.EstatusFirma, r.NombreRol as RolAprobador, f.FechaFirma,
                (SELECT NombreCompleto FROM Usuarios u WHERE u.UsuarioId = f.UsuarioFirmaId) as FirmanteNombre
                FROM SolicitudesVacacionesFirmas f 
                JOIN VacacionesAprobadoresConfig c ON f.ConfigId = c.ConfigId 
                JOIN Roles r ON c.RoleId = r.RoleId
                WHERE f.SolicitudId = S.SolicitudId 
                FOR JSON PATH
            ) as FirmasJSON
            FROM SolicitudesVacaciones S
            JOIN Empleados E ON S.EmpleadoId = E.EmpleadoId
            WHERE (
                S.EmpleadoId IN (SELECT EmpleadoId FROM EmpleadosPermitidos)
                OR S.UsuarioSolicitanteId = @UsuarioId
                OR S.EmpleadoId = @MiEmpleadoId
                -- Si es Admin, forzamos que vea todo (prevención)
                OR EXISTS (SELECT 1 FROM UsuariosRoles WHERE UsuarioId = @UsuarioId AND RoleId = 1)
            )
        `;

        if (empleadoId) {
            query += ` AND S.EmpleadoId = @FiltroEmpleadoId`;
            request.input('FiltroEmpleadoId', sql.Int, empleadoId);
        }

        query += ` ORDER BY S.FechaSolicitud DESC`;

        const result = await request.query(query);

        const records = result.recordset.map(row => {
            if (row.FirmasJSON) {
                try {
                    row.Firmas = JSON.parse(row.FirmasJSON);
                } catch (e) {
                    row.Firmas = [];
                }
            } else {
                row.Firmas = [];
            }
            delete row.FirmasJSON;
            return row;
        });

        res.json(records);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener solicitudes.' });
    }
};

export const createRequest = async (req: any, res: Response) => {
    // Backend calculates all day counts from the schedule tables — do NOT trust front-end values
    const { empleadoId, fechaInicio, fechaFin, comentarios } = req.body;

    if (!empleadoId || !fechaInicio || !fechaFin) {
        return res.status(400).json({ message: 'Faltan parámetros: empleadoId, fechaInicio y fechaFin son obligatorios.' });
    }

    const isOwnRequest = Number(empleadoId) === req.user.empleadoId;
    if (isOwnRequest) {
        if (!req.user.permissions['vacaciones.read'] && !req.user.permissions['vacaciones.manage']) {
            return res.status(403).json({ message: 'No tienes permiso para solicitar vacaciones.' });
        }
    } else {
        if (!req.user.permissions['vacaciones.manage']) {
            return res.status(403).json({ message: 'No tienes permiso para crear solicitudes de otros empleados.' });
        }
    }

    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .input('Comentarios', sql.NVarChar, comentarios || '')
            .input('UsuarioSolicitanteId', sql.Int, req.user.usuarioId)
            .execute('sp_Vacaciones_CrearSolicitud');

        const row = result.recordset[0];
        const isPendienteHorario = row.Estatus === 'PendienteHorario';

        res.status(201).json({
            message: isPendienteHorario
                ? `Solicitud creada pero requiere horario completo en el periodo (${row.DiasSinHorario} día(s) sin horario asignado).`
                : 'Solicitud creada correctamente.',
            id: row.SolicitudId,
            estatus: row.Estatus,
            diasNaturales: row.DiasNaturales,
            diasSolicitados: row.DiasSolicitados,
            diasFeriados: row.DiasFeriados,
            diasDescanso: row.DiasDescanso,
            diasSinHorario: row.DiasSinHorario,
        });
    } catch (err: any) {
        console.error('[createRequest] Fatal Error:', err);
        res.status(500).json({ message: err.message || 'Error al crear solicitud.' });
    }
};

export const respondRequest = async (req: any, res: Response) => {
    const { id } = req.params;
    const { estatus } = req.body; // 'Aprobado', 'Rechazado', 'Cancelado'

    if (!['Aprobado', 'Rechazado', 'Cancelado'].includes(estatus)) {
        return res.status(400).json({ message: 'Estatus inválido.' });
    }

    // Only users with approve permission can respond (except when they cancel their own request)
    if (estatus !== 'Cancelado' && !req.user.permissions['vacaciones.approve']) {
        return res.status(403).json({ message: 'No tienes permiso para autorizar vacaciones.' });
    }

    try {
        const pool = await sql.connect(dbConfig);

        // Block approval when the request still has 'PendienteHorario' status
        if (estatus === 'Aprobado') {
            const check = await pool.request()
                .input('SolicitudId', sql.Int, id)
                .query(`SELECT Estatus FROM SolicitudesVacaciones WHERE SolicitudId = @SolicitudId`);
            if (check.recordset[0]?.Estatus === 'PendienteHorario') {
                return res.status(409).json({
                    message: 'Esta solicitud no puede aprobarse aún. Hay días en el periodo sin horario asignado. Asigna el horario y vuelve a intentarlo.'
                });
            }
        }

        await pool.request()
            .input('SolicitudId', sql.Int, id)
            .input('Estatus', sql.VarChar, estatus)
            .input('UsuarioAutorizoId', sql.Int, req.user.usuarioId)
            .execute('sp_Vacaciones_ResponderSolicitud');

        res.json({ message: `Firma procesada para la solicitud: ${estatus}.` });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al responder solicitud.' });
    }
};

export const getHistory = async (req: any, res: Response) => {
    const { empleadoId } = req.params;
    const isOwn = parseInt(empleadoId as string) === req.user.empleadoId;

    if (!isOwn && !req.user.permissions['vacaciones.read'] && !req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const dbName = dbConfig.database || 'unknown';

        // 1. Obtener todos los saldos (Agnóstico de Anio < 100)
        const result = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .query(`
                SELECT vs.*, 
                ISNULL((SELECT SUM(Dias) FROM VacacionesSaldosDetalle WHERE SaldoId = vs.SaldoId AND Tipo = 'Ajuste'), 0) as DiasAjuste,
                ISNULL((SELECT SUM(Dias) FROM VacacionesSaldosDetalle WHERE SaldoId = vs.SaldoId AND Tipo = 'Pagado'), 0) as DiasPagados
                FROM VacacionesSaldos vs 
                WHERE vs.EmpleadoId = @EmpleadoId 
                ORDER BY vs.Anio DESC
            `);

        const history = result.recordset.map((b: any) => ({
            SaldoId: b.SaldoId,
            Anio: b.Anio,
            FechaInicio: b.FechaInicioPeriodo,
            FechaFin: b.FechaFinPeriodo,
            DiasOtorgados: b.DiasOtorgados || 0,
            DiasDisfrutados: b.DiasDisfrutados || 0,
            DiasAjuste: b.DiasAjuste || 0,
            DiasPagados: b.DiasPagados || 0,
            DiasRestantes: b.DiasRestantes || 0
        }));

        res.setHeader('X-API-Version', `Antigravity-V4 [DB: ${dbName}]`);
        return res.json(history);
    } catch (err: any) {
        console.error('[getHistory] Fatal Error:', err);
        res.status(500).json({ message: err.message, stack: err.stack });
    }
};

export const updateAdjustment = async (req: any, res: Response) => {
    return res.status(400).json({ message: 'El endpoint updateAdjustment directo fue descontinuado. Utilice addAdjustmentDetail.' });
};

// ─── Recalcular saldos desde VacacionesSaldosDetalle (fuente de verdad) ──────
export const recalculate = async (req: any, res: Response) => {
    if (!req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para recalcular.' });
    }
    const { empleadoId } = req.params;
    if (!empleadoId) {
        return res.status(400).json({ message: 'Se requiere empleadoId.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .execute('sp_Vacaciones_Recalcular');
        res.json({ message: 'Saldos recalculados correctamente desde VacacionesSaldosDetalle.' });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al recalcular saldos.' });
    }
};

// ─── Obtener desglose de días (detalle desde Prenómina + Solicitudes) ─────────
export const getDetails = async (req: any, res: Response) => {
    const { empleadoId } = req.params;
    const year = parseInt(req.params.year); // Asegurar que sea número
    const isOwn = parseInt(empleadoId as string) === req.user.empleadoId;

    if (!isOwn && !req.user.permissions['vacaciones.read'] && !req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver estos detalles.' });
    }
    try {
        const pool = await sql.connect(dbConfig);

        // 1. Obtener el registro de saldo para conocer los rangos de fecha (Agnóstico de formato de año)
        const saldoRes = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('Anio', sql.Int, year)
            .query('SELECT * FROM VacacionesSaldos WHERE EmpleadoId = @EmpleadoId AND Anio = @Anio');

        if (saldoRes.recordset.length === 0) {
            return res.status(404).json({ message: 'Periodo de aniversario no encontrado.' });
        }
        const saldo = saldoRes.recordset[0];
        const { FechaInicioPeriodo, FechaFinPeriodo } = saldo;

        // 2. Obtener el concepto de vacaciones a través de la cadena oficial:
        //    SISTiposCalculo (TipoCalculoId='VACACIONES')
        //      → CatalogoEstatusAsistencia.TipoCalculoId
        //      → CatalogoEstatusAsistencia.ConceptoNominaId  (= ConceptoId en CatalogoConceptosNomina)
        //      → ese ConceptoNominaId es el mismo ConceptoId que aparece en PrenominaDetalle.ConceptoId
        const conceptoRes = await pool.request().query(
            `SELECT TOP 1 cea.ConceptoNominaId AS ConceptoId
             FROM SISTiposCalculo stc
             JOIN CatalogoEstatusAsistencia cea ON cea.TipoCalculoId = stc.TipoCalculoId
             WHERE stc.TipoCalculoId = 'VACACIONES'
               AND cea.ConceptoNominaId IS NOT NULL`
        );
        const conceptoVacId = conceptoRes.recordset[0]?.ConceptoId ?? null;

        // Días procesados en Prenómina (histórico real) dentro del rango del periodo
        let prenominaDias: any[] = [];
        if (conceptoVacId) {
            const prenominaRes = await pool.request()
                .input('EmpleadoId', sql.Int, empleadoId)
                .input('ConceptoId', sql.Int, conceptoVacId)
                .input('Inicio', sql.Date, FechaInicioPeriodo)
                .input('Fin', sql.Date, FechaFinPeriodo)
                .query(
                    `SELECT pd.Fecha, pd.Valor as Dias, 'Prenomina' as Fuente, 'Disfrutado' as Tipo
                     FROM Prenomina pr
                     JOIN PrenominaDetalle pd ON pr.Id = pd.CabeceraId
                     WHERE pr.EmpleadoId = @EmpleadoId
                       AND pd.ConceptoId = @ConceptoId
                       AND pd.Fecha BETWEEN @Inicio AND @Fin
                     ORDER BY pd.Fecha`
                );
            prenominaDias = prenominaRes.recordset;
        }

        // Solicitudes aprobadas/pendientes dentro del rango del periodo
        const solicitudesRes = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('Inicio', sql.Date, FechaInicioPeriodo)
            .input('Fin', sql.Date, FechaFinPeriodo)
            .query(
                `SELECT FechaInicio, FechaFin, DiasSolicitados as Dias, 'Solicitud' as Fuente,
                        'Disfrutado' as Tipo,
                        Estatus, Comentarios
                 FROM SolicitudesVacaciones
                 WHERE EmpleadoId = @EmpleadoId
                   AND FechaInicio BETWEEN @Inicio AND @Fin
                 ORDER BY FechaInicio`
            );

        // Detalles Manuales vinculados a este SaldoId (Anniversary)
        const ajustesDetalleRes = await pool.request()
            .input('SaldoId', sql.Int, saldo.SaldoId)
            .query(
                `SELECT DetalleId, Fecha, Dias, Descripcion, 'AjusteDetalle' as Fuente, Tipo
                 FROM VacacionesSaldosDetalle
                 WHERE SaldoId = @SaldoId
                 ORDER BY Fecha`
            );

        res.json({
            prenomina: prenominaDias,
            solicitudes: solicitudesRes.recordset,
            ajustes: ajustesDetalleRes.recordset,
            periodo: {
                inicio: FechaInicioPeriodo,
                fin: FechaFinPeriodo,
                aniversario: year
            }
        });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener detalles.' });
    }
};

// ─── Agregar detalle manual a un saldo ──────────────────────────────────────
export const addAdjustmentDetail = async (req: any, res: Response) => {
    if (!req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }
    const { saldoId, fecha, dias, descripcion, tipo } = req.body;
    if (saldoId === undefined || saldoId === null || !fecha || dias === undefined || dias === null) {
        return res.status(400).json({ message: 'Faltan parámetros obligatorios (SaldoId, Fecha o Dias).' });
    }
    try {
        const pool = await sql.connect(dbConfig);

        // Garantizar que solo haya un registro por tipo 'Ajuste' o 'Pagado' por SaldoId
        if (tipo === 'Ajuste' || tipo === 'Pagado') {
            await pool.request()
                .input('SaldoId', sql.Int, saldoId)
                .input('Tipo', sql.VarChar(50), tipo)
                .query('DELETE FROM VacacionesSaldosDetalle WHERE SaldoId = @SaldoId AND Tipo = @Tipo');
        }

        await pool.request()
            .input('SaldoId', sql.Int, saldoId)
            .input('Fecha', sql.Date, fecha)
            .input('Dias', sql.Decimal(10, 2), dias)
            .input('Descripcion', sql.VarChar(255), (descripcion || 'Ajuste extraordinario manual').substring(0, 255))
            .input('Tipo', sql.VarChar(50), tipo || 'Ajuste')
            .query('INSERT INTO VacacionesSaldosDetalle (SaldoId, Fecha, Dias, Descripcion, Tipo) VALUES (@SaldoId, @Fecha, @Dias, @Descripcion, @Tipo)');

        // Disparar recálculo centralizado para ese empleado
        const saldoRes = await pool.request().input('SaldoId', sql.Int, saldoId).query('SELECT EmpleadoId FROM VacacionesSaldos WHERE SaldoId = @SaldoId');
        if (saldoRes.recordset.length > 0) {
            const { EmpleadoId } = saldoRes.recordset[0];
            await pool.request()
                .input('EmpleadoId', sql.Int, EmpleadoId)
                .execute('sp_Vacaciones_Recalcular');
        }

        res.status(201).json({ message: 'Detalle de ajuste agregado.' });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al agregar detalle.' });
    }
};

// ─── Eliminar detalle manual ────────────────────────────────────────────────
export const deleteAdjustmentDetail = async (req: any, res: Response) => {
    if (!req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }
    const { id } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        // Obtener info antes de borrar para recalcular
        const infoRes = await pool.request().input('Id', sql.Int, id).query(`
            SELECT vs.EmpleadoId, vs.Anio 
            FROM VacacionesSaldosDetalle vd
            JOIN VacacionesSaldos vs ON vd.SaldoId = vs.SaldoId
            WHERE vd.DetalleId = @Id
        `);

        await pool.request().input('Id', sql.Int, id).query('DELETE FROM VacacionesSaldosDetalle WHERE DetalleId = @Id');

        if (infoRes.recordset.length > 0) {
            const { EmpleadoId } = infoRes.recordset[0];
            await pool.request()
                .input('EmpleadoId', sql.Int, EmpleadoId)
                .execute('sp_Vacaciones_Recalcular');
        }

        res.json({ message: 'Detalle de ajuste eliminado.' });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al eliminar detalle.' });
    }
};

