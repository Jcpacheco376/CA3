// src-api/api/controllers/attendance.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const saveAttendance = async (req: any, res: Response) => {
    // Validar permiso
    if (!req.user.permissions['reportesAsistencia.assign']) {
        return res.status(403).json({ message: 'No tienes permiso para registrar la asistencia.' });
    }
    
    // estatusManual ahora puede ser null/undefined para la acción de "Deshacer"
    const { empleadoId, fecha, estatusManual, comentarios } = req.body;

    if (!empleadoId || !fecha) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos (empleado, fecha).' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('Fecha', sql.Date, new Date(fecha))
            .input('EstatusManualAbrev', sql.NVarChar, estatusManual || null) // Enviamos NULL si no hay estatus
            .input('Comentarios', sql.NVarChar, comentarios || null)
            .input('UsuarioId', sql.Int, req.user.usuarioId) 
            .execute('sp_FichasAsistencia_SaveManual'); 

        const action = estatusManual ? 'guardado' : 'restaurado';
        res.status(200).json({ message: `Registro ${action} con éxito.` });
    } catch (err: any) {
        console.error('Error al guardar registro manual:', err);
        res.status(500).json({ message: err.message || 'Error al guardar el registro.' });
    }
};

// ... (Resto de funciones: approveWeek, getDataByRange se mantienen igual)
export const approveWeek = async (req: any, res: Response) => {
    // ... código existente ...
    // (Simplemente copia el resto del archivo original aquí si lo sobrescribes, 
    // pero lo importante es el cambio en saveAttendance de arriba)
     if (!req.user.permissions['reportesAsistencia.approve']) {
        return res.status(403).json({ message: 'No tienes permiso para aprobar la asistencia.' });
    }
    const { empleadoId, weekStartDate } = req.body;
    if (!empleadoId || !weekStartDate) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
    }
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('FechaInicioSemana', sql.Date, new Date(weekStartDate))
            .execute('sp_FichasAsistencia_ApproveWeek');
        
        res.status(200).json({ message: 'Semana aprobada correctamente.' });
    } catch (err: any) {
        console.error('Error en la aprobación rápida:', err);
        res.status(500).json({ message: err.message || 'Error al aprobar la semana.' });
    }
};

export const getDataByRange = async (req: any, res: Response) => {
    // ... código existente ...
     if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    const { startDate, endDate, filters } = req.body;
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
            .execute('sp_FichasAsistencia_GetDataByRange');

        res.json(result.recordset.map(emp => ({ ...emp, FichasSemana: emp.FichasSemana ? JSON.parse(emp.FichasSemana) : [] })));
    } catch (err: any) { 
        res.status(500).json({ message: err.message || 'Error al obtener los datos de asistencia.' }); 
    }
};