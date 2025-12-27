import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';


const toJSONString = (arr: any[]) => {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return '[]';
    return JSON.stringify(arr);
};

export const previewPeriodClose = async (req: any, res: Response) => {
    const {
        grupoNominaId,
        fechaInicio,
        fechaFin,
        // Filtros opcionales
        departamentoIds,
        puestoIds,
        establecimientoIds
    } = req.body;

    // Validación básica de entrada
    if (!grupoNominaId || !fechaInicio || !fechaFin) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos (grupoNominaId, fechaInicio, fechaFin).' });
    }

    try {
        const pool = await sql.connect(dbConfig);

        // 1. KPIs Globales (Resumen general del periodo)
        const resultKPI = await pool.request()
            .input('GrupoNominaId', sql.Int, grupoNominaId)
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .input('DepartamentoIds', sql.NVarChar, toJSONString(departamentoIds))
            .input('PuestoIds', sql.NVarChar, toJSONString(puestoIds))
            .input('EstablecimientoIds', sql.NVarChar, toJSONString(establecimientoIds))
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .execute('sp_Nomina_PrevisualizarCierre');

        // 2. Detalle por Empleado (Para la tabla nueva)
        const resultEmployees = await pool.request()
            .input('GrupoNominaId', sql.Int, grupoNominaId)
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .input('DepartamentoIds', sql.NVarChar, toJSONString(departamentoIds))
            .input('PuestoIds', sql.NVarChar, toJSONString(puestoIds))
            .input('EstablecimientoIds', sql.NVarChar, toJSONString(establecimientoIds))
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .execute('sp_Nomina_ObtenerResumenPorEmpleado');

        // Accedemos al primer recordset [0] y luego al primer registro [0]
        const kpiSummary = (resultKPI.recordsets as any)[0]?.[0] || null;

        res.status(200).json({
            summary: kpiSummary,
            employeeDetails: resultEmployees.recordset || [] // Lista de empleados resumida
        });

    } catch (err: any) {
        console.error("Error en previewPeriodClose:", err);
        res.status(500).json({ message: err.message || 'Error interno al previsualizar el cierre.' });
    }
};

export const executePeriodClose = async (req: any, res: Response) => {
    // Permiso requerido para ejecutar cambios
    if (!req.user.permissions['nomina.admin']) {
        return res.status(403).json({ message: 'No tienes permiso para ejecutar cierres de nómina.' });
    }

    const {
        grupoNominaId,
        fechaInicio,
        fechaFin,
        comentarios,
        departamentoIds,
        puestoIds,
        establecimientoIds
    } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('GrupoNominaId', sql.Int, grupoNominaId)
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('Comentarios', sql.NVarChar, comentarios || '')
            .input('DepartamentoIds', sql.NVarChar, toJSONString(departamentoIds))
            .input('PuestoIds', sql.NVarChar, toJSONString(puestoIds))
            .input('EstablecimientoIds', sql.NVarChar, toJSONString(establecimientoIds))
            .execute('sp_Nomina_EjecutarCierre');

        // result.recordset[0] contiene { Bloqueadas, Pendientes, EstatusFinal }
        res.status(200).json({
            message: 'Proceso de cierre ejecutado correctamente.',
            data: result.recordset[0]
        });

    } catch (err: any) {
        console.error("Error ejecutando cierre:", err);
        res.status(500).json({ message: err.message || 'Error al ejecutar el cierre.' });
    }
};

export const unlockPeriod = async (req: any, res: Response) => {
    // Permiso sensible
    if (!req.user.permissions['nomina.unlock']) {
        return res.status(403).json({ message: 'No tienes permiso para desbloquear periodos.' });
    }

    const { grupoNominaId, fechaInicio, fechaFin, motivo } = req.body;

    if (!motivo) {
        return res.status(400).json({ message: 'Es obligatorio indicar un motivo para el desbloqueo.' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('GrupoNominaId', sql.Int, grupoNominaId)
            .input('FechaInicio', sql.Date, fechaInicio)
            .input('FechaFin', sql.Date, fechaFin)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('Motivo', sql.NVarChar, motivo)
            .execute('sp_Nomina_AbrirPeriodo');

        res.status(200).json({ message: 'Periodo desbloqueado correctamente. Las fichas han regresado a estado VALIDADO.' });

    } catch (err: any) {
        console.error("Error desbloqueando periodo:", err);
        res.status(500).json({ message: err.message || 'Error al desbloquear el periodo.' });
    }
};