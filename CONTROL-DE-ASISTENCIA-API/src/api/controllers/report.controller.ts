// src-api/api/controllers/report.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
//import { validatePayrollPeriod as dbValidate } from '../../config/database'; // Ajusta si usas pool directo

// Helper para convertir arrays a JSON string
const toJSONString = (arr: number[] | undefined) => {
    if (!arr || arr.length === 0) return '[]';
    return JSON.stringify(arr);
};

export const getKardexReport = async (req: any, res: Response) => {
    // Verificamos el permiso genérico de reportes
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate, filters } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        
        // Reutilizamos el SP de asistencia porque trae exactamente la data del Kardex
        // (Este SP ya filtra por los permisos del usuario)
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('DepartamentoFiltro', sql.NVarChar, toJSONString(filters?.departamentos))
            .input('GrupoNominaFiltro', sql.NVarChar, toJSONString(filters?.gruposNomina))
            .input('PuestoFiltro', sql.NVarChar, toJSONString(filters?.puestos))
            .input('EstablecimientoFiltro', sql.NVarChar, toJSONString(filters?.establecimientos))
            .execute('sp_FichasAsistencia_GetDataByRange');
        
        // Procesamos la data para el reporte
        const reportData = result.recordset.map(emp => {
            const fichas = emp.FichasSemana ? JSON.parse(emp.FichasSemana) : [];
            return {
                empleadoId: emp.EmpleadoId,
                nombre: emp.NombreCompleto,
                codRef: emp.CodRef,
                departamento: emp.departamento_nombre,
                puesto: emp.puesto_descripcion,
                fichas: fichas
            };
        });

        res.json(reportData);

    } catch (err: any) {
        console.error("Error en getKardexReport:", err);
        res.status(500).json({ message: 'Error al generar el reporte.' });
    }
};
// ... imports
export const validatePayrollPeriod = async (req: any, res: Response) => {
    // Validar permiso de lectura básico
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        
        // Ejecutamos el SP "Portero"
        const result = await pool.request()
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .execute('sp_Nomina_ValidarPeriodo');

        // Retornamos el resumen del semáforo
        res.json(result.recordset[0]);

    } catch (err: any) {
        console.error("Error validando periodo:", err);
        res.status(500).json({ message: 'Error técnico al validar periodo.', error: err.message });
    }
};