import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const getEmployeeProfile = async (req: any, res: Response) => {
    if (!req.user.permissions['usuarios.read'] && !req.user.permissions['reportesAsistencia.read.own'] && !req.user.permissions['horarios.read']) {
        return res.status(403).json({ message: 'No tienes permiso para ver perfiles de empleado.' });
    }
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ message: 'El ID del empleado es requerido.' });
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().input('EmpleadoId', sql.Int, employeeId).execute('sp_Empleados_GetDatos');
        if (result.recordset.length === 0) return res.status(404).json({ message: 'Empleado no encontrado.' });
        res.json(result.recordset[0]);
    } catch (err: any) {
        res.status(500).json({ message: err.message || 'Error al obtener la información del empleado.' });
    }
};
