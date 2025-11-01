import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const saveAttendance = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para registrar la asistencia.' });
    }
    
    const { empleadoId, fecha, estatusSupervisor, comentarios } = req.body;
    if (!empleadoId || !fecha || !estatusSupervisor) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
    }
    console.log(req.body);
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('Fecha', sql.Date, new Date(fecha))
            .input('EstatusSupervisorAbrev', sql.NVarChar, estatusSupervisor)
            .input('Comentarios', sql.NVarChar, comentarios || null)
            .input('SupervisorId', sql.Int, req.user.usuarioId)
            .execute('sp_FichasAsistencia_SaveSupervisor');

        res.status(200).json({ message: 'Registro guardado con éxito.' });
    } catch (err: any) {
        console.error('Error al guardar registro de asistencia:', err);
        res.status(500).json({ message: err.message || 'Error al guardar el registro.' });
    }
};

export const approveWeek = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para aprobar la asistencia.' });
    }
    const { empleadoId, weekStartDate } = req.body;
    if (!empleadoId || !weekStartDate) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('SupervisorId', sql.Int, req.user.usuarioId)
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('FechaInicioSemana', sql.Date, new Date(weekStartDate))
            .execute('sp_FichasAsistencia_ApproveWeek');
        
        res.status(200).json({ message: 'Semana aprobada correctamente.' });
    } catch (err: any) {
        console.error('Error en la aprobación rápida:', err);
        res.status(500).json({ message: err.message || 'Error al aprobar la semana.' });
    }
};

export const ensureWeek = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
    }
    const { weekStartDate } = req.body;
    if (!weekStartDate) {
        return res.status(400).json({ message: 'Falta la fecha de inicio de semana.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicioSemana', sql.Date, new Date(weekStartDate))
            .execute('sp_FichasAsistencia_ProcessWeekForSupervisor');

        res.status(200).json({ message: 'Semana procesada y preparada correctamente.' });
    } catch (err: any) {
        console.error('Error al procesar la semana:', err);
        res.status(500).json({ message: err.message || 'Error al preparar los datos de la semana.' });
    }
};

export const ensureRange = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.update']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.body;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('FechaInicio', sql.Date, startDate).input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId).execute('sp_FichasAsistencia_ProcesarChecadas');
        res.status(200).json({ message: 'Rango de fechas procesado.' });
    } catch (err: any) { res.status(500).json({ message: err.message || 'Error al procesar el rango.' }); }
};

export const getDataByRange = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.read.own'] && !req.user.permissions['reportesAsistencia.read.all']) return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.query;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate as string)
            .input('FechaFin', sql.Date, endDate as string)
            .execute('sp_FichasAsistencia_GetDataByRange');
        res.json(result.recordset.map(emp => ({ ...emp, FichasSemana: emp.FichasSemana ? JSON.parse(emp.FichasSemana) : [] })));
    } catch (err: any) { res.status(500).json({ message: err.message || 'Error al obtener los datos de asistencia.' }); }
};
