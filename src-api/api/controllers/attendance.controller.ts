// src-api/api/controllers/attendance.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
import { Console } from 'console';

export const saveAttendance = async (req: any, res: Response) => {
    // Validar permiso de escritura (asignación)
    if (!req.user.permissions['reportesAsistencia.assign']) {
        return res.status(403).json({ message: 'No tienes permiso para registrar la asistencia.' });
    }
    
    const { empleadoId, fecha, estatusManual, comentarios } = req.body;

    if (!empleadoId || !fecha || !estatusManual) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos (empleado, fecha o estatus).' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('Fecha', sql.Date, new Date(fecha))
            .input('EstatusManualAbrev', sql.NVarChar, estatusManual)
            .input('Comentarios', sql.NVarChar, comentarios || null)
            .input('UsuarioId', sql.Int, req.user.usuarioId) 
            .execute('sp_FichasAsistencia_SaveManual'); 

        res.status(200).json({ message: 'Registro manual guardado con éxito.' });
    } catch (err: any) {
        console.error('Error al guardar registro manual:', err);
        res.status(500).json({ message: err.message || 'Error al guardar el registro.' });
    }
};

// export const approveWeek = async (req: any, res: Response) => {
//     // --- MODIFICACIÓN: De 'update' a 'approve' ---
//     if (!req.user.permissions['reportesAsistencia.approve']) {
//         return res.status(403).json({ message: 'No tienes permiso para aprobar la asistencia.' });
//     }
//     const { empleadoId, weekStartDate } = req.body;
//     if (!empleadoId || !weekStartDate) {
//         return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
//     }
// console.log('Aprobando semana para empleadoId:', empleadoId, 'semana que inicia en:', weekStartDate);
//     try {
//         const pool = await sql.connect(dbConfig);
//         await pool.request()
//             .input('UsuarioId', sql.Int, req.user.usuarioId)
//             .input('EmpleadoId', sql.Int, empleadoId)
//             .input('FechaInicioSemana', sql.Date, new Date(weekStartDate))
//             .execute('sp_FichasAsistencia_ApproveWeek');
        
//         res.status(200).json({ message: 'Semana aprobada correctamente.' });
//     } catch (err: any) {
//         console.error('Error en la aprobación rápida:', err);
//         res.status(500).json({ message: err.message || 'Error al aprobar la semana.' });
//     }
// };

// export const ensureWeek = async (req: any, res: Response) => {
//     // --- MODIFICACIÓN: De 'update' a 'assign' ---
//     if (!req.user.permissions['reportesAsistencia.assign']) {
//         return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
//     }
//     const { weekStartDate } = req.body;
//     if (!weekStartDate) {
//         return res.status(400).json({ message: 'Falta la fecha de inicio de semana.' });
//     }

//     try {
//         const pool = await sql.connect(dbConfig);
//         await pool.request()
//             .input('UsuarioId', sql.Int, req.user.usuarioId)
//             .input('FechaInicioSemana', sql.Date, new Date(weekStartDate))
//             .execute('sp_FichasAsistencia_ProcessWeekForSupervisor');

//         res.status(200).json({ message: 'Semana procesada y preparada correctamente.' });
//     } catch (err: any) {
//         console.error('Error al procesar la semana:', err);
//         res.status(500).json({ message: err.message || 'Error al preparar los datos de la semana.' });
//     }
// };

// export const ensureRange = async (req: any, res: Response) => {
//     // --- MODIFICACIÓN: De 'update' a 'assign' ---
//     if (!req.user.permissions['reportesAsistencia.assign']) return res.status(403).json({ message: 'Acceso denegado.' });
//     const { startDate, endDate } = req.body;
//     try {
//         const pool = await sql.connect(dbConfig);
//         await pool.request()
//             .input('FechaInicio', sql.Date, startDate)
//             .input('FechaFin', sql.Date, endDate)
//             .input('UsuarioId', sql.Int, req.user.usuarioId).execute('sp_FichasAsistencia_ProcesarChecadas');
//         res.status(200).json({ message: 'Rango de fechas procesado.' });
//     } catch (err: any) { res.status(500).json({ message: err.message || 'Error al procesar el rango.' }); }
// };

export const getDataByRange = async (req: any, res: Response) => {
    // --- MODIFICACIÓN: Simplificado a 'read' ---
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    const { 
        startDate, 
        endDate,
        filters // { departamentos: [1, 2], gruposNomina: [3], puestos: [], establecimientos: [] }
    } = req.body;

   
    // Helper para convertir un array de IDs (o undefined) en un string JSON para el SP
    const toJSONString = (arr: number[] | undefined) => {
        if (!arr || arr.length === 0) return '[]'; // Enviar '[]' si está vacío
        return JSON.stringify(arr);
    };
console.log('Obteniendo datos de asistencia desde', startDate, 'hasta', endDate, 'con filtros:', filters);
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

            
        console.log('Datos de asistencia obtenidos:', result.recordset);
        res.json(result.recordset.map(emp => ({ ...emp, FichasSemana: emp.FichasSemana ? JSON.parse(emp.FichasSemana) : [] })));
    } catch (err: any) { 
        res.status(500).json({ message: err.message || 'Error al obtener los datos de asistencia.' }); 
    }
};