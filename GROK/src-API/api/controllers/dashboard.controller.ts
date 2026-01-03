// src-api/api/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import { dbConfig } from '../../config/database';
import sql from 'mssql';

// --- WIDGET: STATS ---
export const getDashboardStats = async (req: any, res: Response) => {
    // Permiso: dashboard.daily_stats.read
    if (!req.user?.permissions['dashboard.daily_stats.read']) {
        return res.status(403).json({ message: 'No tienes permiso para ver estadísticas del dashboard.' });
    }

    try {
        const userId = req.user?.usuarioId;
        if (userId === undefined) return res.status(401).json({ message: 'Usuario no autenticado' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, userId)
            .input('TipoWidget', sql.VarChar, 'STATS')
            .execute('sp_Dashboard_GetWidgets');

        // Devolvemos el primer registro (objeto único) en lugar de un array
        const data = result.recordset[0] || { TotalPlantilla: 0, Presentes: 0, Retardos: 0, Ausencias: 0 };
        return res.json(data);

    } catch (error: any) {
        console.error(`Error en Dashboard Widget (stats):`, error);
        return res.status(500).json({ message: 'Error al obtener datos de estadísticas del dashboard' });
    }
};

// --- WIDGET: TRENDS ---
export const getDashboardTrends = async (req: any, res: Response) => {
    // Permiso: dashboard.distribution
    if (!req.user?.permissions['dashboard.distribution.read']) {
        return res.status(403).json({ message: 'No tienes permiso para ver tendencias del dashboard.' });
    }

    try {
        const userId = req.user?.usuarioId;
        if (userId === undefined) return res.status(401).json({ message: 'Usuario no autenticado' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, userId)
            .input('TipoWidget', sql.VarChar, 'TRENDS')
            .execute('sp_Dashboard_GetWidgets');

        // Formatear fechas a días de la semana (Lun, Mar, etc.)
        const daysMap = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        const data = result.recordset.map((item: any) => {
            const date = new Date(item.Fecha);
            // Ajuste de zona horaria simple para evitar desfases de día
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            const correctedDate = new Date(date.getTime() + userTimezoneOffset);

            return {
                day: daysMap[correctedDate.getDay()],
                value: Math.round(item.PorcentajeAsistencia || 0),
                fullDate: item.Fecha // Útil para tooltips detallados
            };
        });

        return res.json(data);

    } catch (error: any) {
        console.error(`Error en Dashboard Widget (trends):`, error);
        return res.status(500).json({ message: 'Error al obtener datos de tendencias del dashboard' });
    }
};

// --- WIDGET: ACTIONS ---
export const getDashboardActions = async (req: any, res: Response) => {
    // Permiso: dashboard.action_center.read
    if (!req.user?.permissions['dashboard.action_center.read']) {
        return res.status(403).json({ message: 'No tienes permiso para ver acciones del dashboard.' });
    }

    try {
        const userId = req.user?.usuarioId;
        if (userId === undefined) return res.status(401).json({ message: 'Usuario no autenticado' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, userId)
            .input('TipoWidget', sql.VarChar, 'ACTIONS')
            .execute('sp_Dashboard_GetWidgets');

        return res.json(result.recordset);

    } catch (error: any) {
        console.error(`Error en Dashboard Widget (actions):`, error);
        return res.status(500).json({ message: 'Error al obtener datos de acciones del dashboard' });
    }
};

// --- WIDGET: PAYROLL ---
export const getDashboardPayroll = async (req: any, res: Response) => {
    // Permiso: nomina.read
    if (!req.user?.permissions['nomina.read']) {
        return res.status(403).json({ message: 'No tienes permiso para ver datos de nómina.' });
    }

    try {
        const userId = req.user?.usuarioId;
        if (userId === undefined) return res.status(401).json({ message: 'Usuario no autenticado' });

        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('UsuarioId', sql.Int, userId)
            .input('TipoWidget', sql.VarChar, 'PAYROLL')
            .execute('sp_Dashboard_GetWidgets');

        // CAMBIO: Ahora devolvemos todo el recordset (array), no solo el primer elemento
        // porque puede haber múltiples grupos de nómina.
        return res.json(result.recordset);

    } catch (error: any) {
        console.error(`Error en Dashboard Widget (payroll):`, error);
        return res.status(500).json({ message: 'Error al obtener datos de nómina' });
    }
};