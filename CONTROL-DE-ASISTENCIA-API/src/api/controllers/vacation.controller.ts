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
            SELECT S.*, E.NombreCompleto, E.CodRef,
            (
                SELECT f.EstatusFirma, c.RolAprobador, f.FechaFirma 
                FROM SolicitudesVacacionesFirmas f 
                JOIN VacacionesAprobadoresConfig c ON f.ConfigId = c.ConfigId 
                WHERE f.SolicitudId = S.SolicitudId 
                FOR JSON PATH
            ) as FirmasJSON
            FROM SolicitudesVacaciones S
            JOIN Empleados E ON S.EmpleadoId = E.EmpleadoId
            WHERE 1=1
        `;
        const request = pool.request();

        if (!isManager) {
            // If they are not manager, they can only see their own
            query += ` AND S.EmpleadoId = @ReqEmpleado`;
            request.input('ReqEmpleado', sql.Int, req.user.empleadoId);
        }

        if (empleadoId) {
            query += ` AND S.EmpleadoId = @EmpleadoId`;
            request.input('EmpleadoId', sql.Int, empleadoId);
        }

        query += ` ORDER BY S.FechaSolicitud DESC`;

        const result = await request.query(query);

        // Parse FirmasJSON strings back to objects
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
    // Empleados can request their own
    const { empleadoId, fechaInicio, fechaFin, diasSolicitados, comentarios } = req.body;

    if (!empleadoId || !fechaInicio || !fechaFin || !diasSolicitados) {
        return res.status(400).json({ message: 'Faltan parámetros.' });
    }

    try {
        const pool = await sql.connect(dbConfig);

        // Determine role of requester for auto-signing logic
        let solicitanteRol = 'Empleado';
        if (empleadoId !== req.user.empleadoId) {
            solicitanteRol = 'RecursosHumanos';
        }

        const result = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .input('DiasSolicitados', sql.Int, diasSolicitados)
            .input('Comentarios', sql.NVarChar, comentarios || '')
            .input('UsuarioSolicitanteId', sql.Int, req.user.usuarioId)
            .input('SolicitanteRolName', sql.VarChar, solicitanteRol)
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
        // By default, system users approving currently mock 'RecursosHumanos'
        // If they had proper hierarchical roles attached to their JWT we would use that.
        const rolAprobador = 'RecursosHumanos';

        await pool.request()
            .input('SolicitudId', sql.Int, id)
            .input('Estatus', sql.VarChar, estatus)
            .input('UsuarioAutorizoId', sql.Int, req.user.usuarioId)
            .input('RolAprobador', sql.VarChar, rolAprobador)
            .execute('sp_Vacaciones_ResponderSolicitud');

        res.json({ message: `Firma de ${rolAprobador} procesada para la solicitud: ${estatus}.` });
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al responder solicitud.' });
    }
};
