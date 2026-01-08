// src-api/api/controllers/report.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';
import { console } from 'inspector';

// Helper para convertir arrays a JSON string
const toJSONString = (arr: number[] | undefined) => {
    if (!arr || arr.length === 0) return '[]';
    return JSON.stringify(arr);
};

// --- REPORTE KARDEX ---
export const getKardexReport = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate, filters } = req.body;

    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('DepartamentoFiltro', sql.NVarChar, toJSONString(filters?.departamentos))
            .input('GrupoNominaFiltro', sql.NVarChar, toJSONString(filters?.gruposNomina))
            .input('PuestoFiltro', sql.NVarChar, toJSONString(filters?.puestos))
            .input('EstablecimientoFiltro', sql.NVarChar, toJSONString(filters?.establecimientos))
            .execute('sp_FichasAsistencia_GetDataByRange');

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

// --- REPORTE LISTA DE ASISTENCIA ---
export const getAttendanceListReport = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate, filters } = req.body;

    try {
        const pool = await sql.connect(dbConfig);

        // 1. Leer Configuración de la Empresa
        const configRes = await pool.request().query(`
            SELECT ConfigKey, ConfigValue FROM ConfiguracionSistema 
            WHERE ConfigKey IN ('Nomina_ModoCalculo', 'Nomina_ToleranciaRedondeo')
        `);

        // Defaults seguros
        let calcMode: 'EXACTO' | 'COMPLETAS' | 'REDONDEO' = 'EXACTO';
        let tolerance = 15;

        configRes.recordset.forEach((row: any) => {
            if (row.ConfigKey === 'Nomina_ModoCalculo') calcMode = row.ConfigValue;
            if (row.ConfigKey === 'Nomina_ToleranciaRedondeo') tolerance = parseInt(row.ConfigValue, 10);
        });

        // 2. Obtener Datos
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('DepartamentoFiltro', sql.NVarChar, toJSONString(filters?.departamentos))
            .input('GrupoNominaFiltro', sql.NVarChar, toJSONString(filters?.gruposNomina))
            .input('PuestoFiltro', sql.NVarChar, toJSONString(filters?.puestos))
            .input('EstablecimientoFiltro', sql.NVarChar, toJSONString(filters?.establecimientos))
            .execute('sp_FichasAsistencia_GetDataByRange');

        // 3. Procesar con Lógica
        const reportData = result.recordset.map(emp => {
            const fichasRaw = emp.FichasSemana ? JSON.parse(emp.FichasSemana) : [];
            let totalHorasPeriodo = 0;

            const fichasProcesadas = fichasRaw.map((f: any) => {
                const lunchMins = f.MinutosComida || 0; // Viene del SP nuevo
                const horasDia = calculateNetHours(f.HoraEntrada, f.HoraSalida, lunchMins, calcMode, tolerance);

                totalHorasPeriodo += horasDia;

                return {
                    ...f,
                    HorasTrabajadas: horasDia
                };
            });

            return {
                empleadoId: emp.EmpleadoId,
                nombre: emp.NombreCompleto,
                codRef: emp.CodRef,
                departamento: emp.departamento_nombre,
                puesto: emp.puesto_descripcion,
                totalHoras: totalHorasPeriodo.toFixed(2), // Total formateado
                fichas: fichasProcesadas
            };
        });

        res.json(reportData);

    } catch (err: any) {
        console.error("Error en getAttendanceListReport:", err);
        res.status(500).json({ message: 'Error al obtener la lista de asistencia.' });
    }
};

// --- VALIDACIÓN DE PERIODO (ACTUALIZADO CON FILTROS) ---
export const validatePayrollPeriod = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate, filters } = req.body;

    try {
        const pool = await sql.connect(dbConfig);

        console.log("Validando periodo con filtros:", { startDate, endDate, filters });

        const result = await pool.request()
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            // Pasamos los filtros al SP validador
            .input('DepartamentoFiltro', sql.NVarChar, toJSONString(filters?.departamentos))
            .input('GrupoNominaFiltro', sql.NVarChar, toJSONString(filters?.gruposNomina))
            .input('PuestoFiltro', sql.NVarChar, toJSONString(filters?.puestos))
            .input('EstablecimientoFiltro', sql.NVarChar, toJSONString(filters?.establecimientos))
            .execute('sp_Nomina_ValidarPeriodo');

        res.json(result.recordset[0]);
    } catch (err: any) {
        console.error("Error validando periodo:", err);
        res.status(500).json({ message: 'Error técnico al validar periodo.', error: err.message });
    }
};

const calculateNetHours = (
    entrada: string | null,
    salida: string | null,
    lunchMinutes: number,
    mode: 'EXACTO' | 'COMPLETAS' | 'REDONDEO',
    tolerance: number
): number => {
    if (!entrada || !salida) return 0;

    const d1 = new Date(entrada);
    const d2 = new Date(salida);
    const diffMs = d2.getTime() - d1.getTime();

    if (diffMs <= 0) return 0;

    // 1. Calcular minutos brutos y restar comida
    let totalMinutes = diffMs / (1000 * 60);
    totalMinutes = Math.max(0, totalMinutes - lunchMinutes); // Restar comida (protección contra negativos)

    // 2. Aplicar Reglas de Negocio
    if (mode === 'EXACTO') {
        // Ejemplo: 8h 30m = 8.50
        return parseFloat((totalMinutes / 60).toFixed(2));
    }

    if (mode === 'COMPLETAS') {
        // Ejemplo: 8h 59m = 8.00 (Se pierde el sobrante diario)
        return Math.floor(totalMinutes / 60);
    }

    if (mode === 'REDONDEO') {
        // Ejemplo: 8h 46m (Tolerancia 15 para sgte hora) -> 9.00
        // Ejemplo: 8h 10m (Tolerancia 15) -> 8.00
        const hours = Math.floor(totalMinutes / 60);
        const remainder = totalMinutes % 60;

        // Si el sobrante supera (60 - tolerancia), regalamos la hora siguiente
        // OJO: Esta es una interpretación común. Ajusta según tu regla exacta.
        if (remainder >= (60 - tolerance)) {
            return hours + 1;
        }
        return hours;
    }

    return 0;
};


export const getPrenominaReport = async (req: any, res: Response) => {
    // 1. Verificación de Permisos
    if (!req.user.permissions['reportes.prenomina.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    console.log(req.body);
    const { startDate, endDate, grupoNominaId } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        console.log("Generando prenómina con filtros:", { startDate, endDate, grupoNominaId });
        // 2. Ejecutar el Stored Procedure
        const result = await pool.request()
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('GrupoNominaId', sql.Int, grupoNominaId)
            .execute('sp_Reporte_Prenomina');

        console.log("Resultado del SP sp_Reporte_Prenomina:", result.recordset);
        const reportData = result.recordset.map(row => {
            let conceptos = [];
            try {
                if (row.ConceptosCalculados) {
                    conceptos = typeof row.ConceptosCalculados === 'string'
                        ? JSON.parse(row.ConceptosCalculados)
                        : row.ConceptosCalculados;
                }
            } catch (e) {
                conceptos = [];
            }

            return { ...row, ConceptosCalculados: conceptos };
        });

        res.json(reportData);

    } catch (err: any) {
        console.error("Error en getPrenominaReport:", err);
        res.status(500).json({ message: 'Error al generar la prenómina.' });
    }
};

export const validatePrenominaPeriod = async (req: any, res: Response) => {
    if (!req.user.permissions['reportes.prenomina.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }

    const { startDate, endDate, grupoNominaId } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('GrupoNominaId', sql.Int, grupoNominaId)
            .execute('sp_Prenomina_ValidarCierre');

        res.json(result.recordset[0]);
    } catch (err: any) {
        console.error("Error validando prenómina:", err);
        res.status(500).json({ message: 'Error técnico.', error: err.message });
    }
};