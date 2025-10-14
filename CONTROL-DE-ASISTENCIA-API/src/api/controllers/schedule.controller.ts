import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
import { Console } from 'console';

export const getSchedules = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().execute('sp_Horarios_GetAll');
        res.json(result.recordset);
        
    } catch (err: any) { res.status(500).json({ message: 'Error al obtener catálogo de horarios.', error: err.message }); }
};

export const getScheduleAssignments = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.read']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    console.log(req.query);
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate as string)
            .input('FechaFin', sql.Date, endDate as string)
            .execute('sp_HorariosTemporales_GetByPeriodo');
        res.json(result.recordset.map(emp => ({ ...emp, HorariosAsignados: emp.HorariosAsignados ? JSON.parse(emp.HorariosAsignados) : [] })));
    } catch (err: any) { res.status(500).json({ message: err.message || 'Error al obtener los datos.' }); }
};

export const saveScheduleAssignments = async (req: any, res: Response) => {
    if (!req.user.permissions['horarios.assign']) return res.status(403).json({ message: 'Acceso denegado.' });
    const assignments = req.body;
    if (!Array.isArray(assignments)) return res.status(400).json({ message: 'Se esperaba un arreglo de asignaciones.' });
    const pool = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(pool);
    console.log(assignments);
    try {
        await transaction.begin();
        await Promise.all(assignments.map(async (assignment) => {
            const { empleadoId, fecha, horarioId } = assignment;
            if (!empleadoId || !fecha) return;
            await new sql.Request(transaction)
                .input('EmpleadoId', sql.Int, empleadoId).input('Fecha', sql.Date, new Date(fecha))
                .input('HorarioId', sql.Int, horarioId).input('SupervisorId', sql.Int, req.user.usuarioId)
                .execute('sp_HorariosTemporales_Upsert');
        }));
        await transaction.commit();
        res.status(200).json({ message: 'Asignaciones guardadas correctamente.' });
    } catch (err: any) {
        await transaction.rollback();
        console.error('Error al guardar las asignaciones:', err);
        res.status(500).json({ message: err.message || 'Error al guardar las asignaciones.' });
    }
};


