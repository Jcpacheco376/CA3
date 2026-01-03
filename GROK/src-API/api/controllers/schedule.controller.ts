import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
// No necesitas importar 'Console'

// getSchedules se mantiene igual...
export const getSchedules = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        // Asegúrate que llamas al SP correcto que devuelve los detalles/turnos
        const result = await pool.request().execute('sp_Horarios_GetAll'); // Este SP devuelve los Turnos JSON

        // Parsear el JSON de Turnos devuelto por el SP modificado
        const horarios = result.recordset.map(h => ({
            ...h,
            Turnos: h.Turnos ? JSON.parse(h.Turnos) : []
        }));

        res.json(horarios);

    } catch (err: any) { res.status(500).json({ message: 'Error al obtener catálogo de horarios.', error: err.message }); }
};

// getScheduleAssignments se mantiene igual...
export const getScheduleAssignments = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate, filters } = req.body;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }

    const toJSONString = (arr: number[] | undefined) => {
        if (!arr || arr.length === 0) return '[]';
        return JSON.stringify(arr);
    };

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate as string)
            .input('FechaFin', sql.Date, endDate as string)
            .input('DepartamentoFiltro', sql.NVarChar, toJSONString(filters?.departamentos))
            .input('GrupoNominaFiltro', sql.NVarChar, toJSONString(filters?.gruposNomina))
            .input('PuestoFiltro', sql.NVarChar, toJSONString(filters?.puestos))
            .input('EstablecimientoFiltro', sql.NVarChar, toJSONString(filters?.establecimientos))
            .execute('sp_HorariosTemporales_GetByPeriodo');

        const processedResults = result.recordset.map(emp => ({
            ...emp,
            // Parseamos los Horarios (Asignaciones)
            HorariosAsignados: emp.HorariosAsignados ? JSON.parse(emp.HorariosAsignados) : [],
            // NUEVO: Parseamos los Estados de las Fichas
            FichasExistentes: emp.FichasExistentes ? JSON.parse(emp.FichasExistentes) : []
        }));

        res.json(processedResults);
    } catch (err: any) {
        console.error("Error en getScheduleAssignments:", err);
        res.status(500).json({ message: err.message || 'Error al obtener los datos.' });
    }
};
export const validateScheduleBatch = async (req: any, res: Response) => {
    // Validación de permisos
    if (!req.user.permissions['horarios.assign']) return res.status(403).json({ message: 'Acceso denegado.' });

    const assignments = Array.isArray(req.body) ? req.body : (req.body.assignments || []);
    const validAssignments = assignments.filter((a: any) => a.empleadoId && a.fecha);

    if (validAssignments.length === 0) return res.json({ status: 'OK' });

    let pool: sql.ConnectionPool | null = null;

    try {
        pool = await sql.connect(dbConfig);

        let hasValidated = false;

        // Iteramos para verificar el estado de cada día
        for (const assignment of validAssignments) {
            const { empleadoId, fecha } = assignment;

            const request = new sql.Request(pool);
            request.input('EmpId', sql.Int, empleadoId);
            request.input('Fecha', sql.Date, new Date(fecha));

            // Consultamos el estado directo de la ficha
            const result = await request.query(`
                SELECT Estado 
                FROM dbo.FichaAsistencia 
                WHERE EmpleadoId = @EmpId AND Fecha = @Fecha
            `);

            const estado = result.recordset[0]?.Estado;

            if (estado === 'BLOQUEADO') {
                // Si encontramos UN SOLO día bloqueado, detenemos todo.
                return res.json({
                    status: 'BLOCKING_ERROR',
                    message: `El empleado ${empleadoId} tiene el día ${fecha} en un periodo CERRADO (Bloqueado). No se pueden aplicar cambios.`
                });
            }

            if (estado === 'VALIDADO') {
                hasValidated = true;
            }
        }

        // Si pasamos el bucle sin errores bloqueantes, revisamos si hubo advertencias
        if (hasValidated) {
            return res.json({
                status: 'CONFIRMATION_REQUIRED',
                message: 'Existen fichas ya VALIDADAS en el rango seleccionado. Se requiere confirmación para regenerarlas.'
            });
        }

        // Si todo está limpio
        return res.json({ status: 'OK' });

    } catch (err: any) {
        console.error("Error en validación:", err);
        return res.status(500).json({ message: 'Error interno al validar el periodo.' });
    } finally {
        if (pool && pool.connected) await pool.close();
    }
};

export const saveScheduleAssignments = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.assign']) return res.status(403).json({ message: 'Acceso denegado.' });

    const assignments = Array.isArray(req.body) ? req.body : (req.body.assignments || []);
    const validAssignments = assignments.filter((a: any) => a.empleadoId && a.fecha);

    if (validAssignments.length === 0) return res.status(400).json({ message: 'Sin datos.' });

    let pool: sql.ConnectionPool | null = null;
    let transaction: sql.Transaction | null = null;

    try {
        pool = await sql.connect(dbConfig);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        for (const assignment of validAssignments) {
            const { empleadoId, fecha, tipoAsignacion, horarioId, detalleId } = assignment;

            const request = new sql.Request(transaction);
            request.input('EmpleadoId', sql.Int, empleadoId);
            request.input('Fecha', sql.Date, new Date(fecha));
            request.input('UsuarioId', sql.Int, req.user.usuarioId);
            request.input('TipoAsignacion', sql.Char(1), tipoAsignacion || null);
            request.input('HorarioId', sql.Int, (tipoAsignacion === 'H' ? horarioId : null) || null);
            request.input('HorarioDetalleId', sql.Int, (tipoAsignacion === 'T' ? detalleId : null) || null);

            await request.execute('sp_HorariosTemporales_Upsert');
        }

        await transaction.commit();
        res.status(200).json({ message: 'Guardado correctamente.' });

    } catch (err: any) {
        if (transaction) { try { await transaction.rollback(); } catch (e) { } }

        // El SP aún puede lanzar 51000 si intentan saltarse la validación
        if (err.number === 51000) {
            return res.status(409).json({ error: 'BLOCKING_ERROR', message: err.message });
        }

        console.error('Error saveScheduleAssignments:', err);
        res.status(500).json({ message: err.message || 'Error interno.' });
    } finally {
        if (pool && pool.connected) await pool.close();
    }
};