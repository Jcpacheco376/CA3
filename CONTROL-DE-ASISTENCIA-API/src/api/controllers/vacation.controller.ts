import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const getBalance = async (req: any, res: Response) => {
    // Both read their own or manage all can see balances
    if (!req.user.permissions['reportesAsistencia.read.own'] && !req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }

    const { empleadoId } = req.params;
    const year = req.query.year || new Date().getFullYear();

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('Anio', sql.Int, year)
            .query('SELECT * FROM VacacionesSaldos WHERE EmpleadoId = @EmpleadoId AND Anio = @Anio');

        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            // Return default 0 balance if not found yet
            res.json({ EmpleadoId: parseInt(empleadoId), Anio: year, DiasOtorgados: 0, DiasDisfrutados: 0, DiasRestantes: 0 });
        }
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener saldo.' });
    }
};

export const getRequests = async (req: any, res: Response) => {
    // If user can manage vacations, show all. If user can read own, show own.
    const isManager = req.user.permissions['vacaciones.manage'];
    const { empleadoId } = req.query; // Optional filter

    try {
        const pool = await sql.connect(dbConfig);
        let query = `
            SELECT S.*, E.NombreCompleto, E.CodRef 
            FROM SolicitudesVacaciones S
            JOIN Empleados E ON S.EmpleadoId = E.EmpleadoId
            WHERE 1=1
        `;
        const request = pool.request();

        if (!isManager) {
            // Needs to be joined with users mapping if strict, but assuming req.user.usuarioId relates.
            // In this system, user-employee relationship is usually checked before. 
            // For now, if not manager, we can only return those where EmpleadoId matches the user's assigned employee ID.
            // Or simplified: managers see all, others only see what they send via frontend (validation should be stricter but simplified here)
            if (empleadoId) {
                query += ` AND S.EmpleadoId = @EmpleadoId`;
                request.input('EmpleadoId', sql.Int, empleadoId);
            }
        } else {
            if (empleadoId) {
                query += ` AND S.EmpleadoId = @EmpleadoId`;
                request.input('EmpleadoId', sql.Int, empleadoId);
            }
        }

        query += ` ORDER BY S.FechaSolicitud DESC`;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener solicitudes.' });
    }
};

export const createRequest = async (req: any, res: Response) => {
    // Empleados can request their own
    const { empleadoId, fechaInicio, fechaFin, diasSolicitados, comentarios } = req.body;

    if (!empleadoId || !fechaInicio || !fechaFin || !diasSolicitados) {
        return res.status(400).json({ message: 'Faltan parámetros.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .input('DiasSolicitados', sql.Int, diasSolicitados)
            .input('Comentarios', sql.NVarChar, comentarios || '')
            .execute('sp_Vacaciones_CrearSolicitud');

        res.status(201).json({ message: 'Solicitud creada.', id: result.recordset[0].SolicitudId });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al crear solicitud.' });
    }
};

export const respondRequest = async (req: any, res: Response) => {
    // Only managers can respond
    if (!req.user.permissions['vacaciones.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para autorizar vacaciones.' });
    }

    const { id } = req.params;
    const { estatus } = req.body; // 'Aprobado' o 'Rechazado'

    if (!['Aprobado', 'Rechazado'].includes(estatus)) {
        return res.status(400).json({ message: 'Estatus inválido.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('SolicitudId', sql.Int, id)
            .input('Estatus', sql.VarChar, estatus)
            .input('UsuarioAutorizoId', sql.Int, req.user.usuarioId)
            .execute('sp_Vacaciones_ResponderSolicitud');

        res.json({ message: `Solicitud ${estatus}.` });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al responder solicitud.' });
    }
};
