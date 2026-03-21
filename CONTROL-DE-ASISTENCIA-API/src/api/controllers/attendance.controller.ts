// src-api/api/controllers/attendance.controller.ts
import { Request, Response } from 'express';
import sql from 'mssql';
import { dbConfig } from '../../config/database';

export const saveAttendance = async (req: any, res: Response) => {
    // 1. Validar Permiso
    if (!req.user.permissions['reportesAsistencia.assign']) {
        return res.status(403).json({ message: 'No tienes permiso para registrar la asistencia.' });
    }

    // 2. Obtener datos del Body
    // estatusManual puede ser null (para deshacer/limpiar)
    const { empleadoId, fecha, estatusManual, comentarios } = req.body;

    if (!empleadoId || !fecha) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos (empleado, fecha).' });
    }

    try {
        const pool = await sql.connect(dbConfig);

        // 3. Ejecutar SP
        const result = await pool.request()
            .input('EmpleadoId', sql.Int, empleadoId)
            .input('Fecha', sql.Date, new Date(fecha))
            .input('EstatusManualAbrev', sql.NVarChar, estatusManual || null) // Null si es deshacer
            .input('Comentarios', sql.NVarChar, comentarios || null)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .execute('sp_FichasAsistencia_SaveManual');

        // 4. Capturar la Ficha Actualizada (Sincronización Bidireccional)
        // El SP ahora hace un SELECT al final con el estado real (incluyendo IncidenciaActivaId)
        const updatedFicha = result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;

        const action = estatusManual ? 'guardado' : 'restaurado';

        res.status(200).json({
            message: `Registro ${action} con éxito.`,
            data: updatedFicha
        });

    } catch (err: any) {
        console.error('Error al guardar registro manual:', err);
        // Manejo de errores específicos de SQL (ej. Bloqueo)
        if (err.message && err.message.includes('CERRADO')) {
            return res.status(409).json({ message: err.message }); // 409 Conflict
        }
        res.status(500).json({ message: err.message || 'Error al guardar el registro.' });
    }
};

// ... (Resto de funciones: approveWeek, getDataByRange se mantienen igual)
// export const approveWeek = async (req: any, res: Response) => {
//     // ... código existente ...
//     // (Simplemente copia el resto del archivo original aquí si lo sobrescribes, 
//     // pero lo importante es el cambio en saveAttendance de arriba)
//      if (!req.user.permissions['reportesAsistencia.approve']) {
//         return res.status(403).json({ message: 'No tienes permiso para aprobar la asistencia.' });
//     }
//     const { empleadoId, weekStartDate } = req.body;
//     if (!empleadoId || !weekStartDate) {
//         return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
//     }
//     try {
//         const pool = await sql.connect(dbConfig);
//         console.log('Aprobando semana para EmpleadoId:', empleadoId, 'Semana que inicia en:', weekStartDate);
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

export const getDataByRange = async (req: any, res: Response) => {
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

export const getRawChecadas = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    const { empleadoId, startDate, endDate } = req.body;
    if (!empleadoId || !startDate || !endDate) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos (empleadoId, startDate, endDate).' });
    }

    try {
        const pool = await sql.connect(dbConfig);

        // Ajustar fechas para el query de SQL
        const query = `
            SET DATEFIRST 1;
            DECLARE @EmpId INT = @ParamEmpleadoId;
            DECLARE @S DATE = @ParamStartDate;
            DECLARE @E DATE = @ParamEndDate;

            -- 1. Checadas
            SELECT ChecadaId, EmpleadoId, FechaHora, Checador
            FROM dbo.Checadas
            WHERE EmpleadoId = @EmpId
              AND FechaHora BETWEEN @S AND DATEADD(SECOND, -1, DATEADD(DAY, 1, CAST(@E AS DATETIME)))
            ORDER BY FechaHora ASC;

            -- 2. Horarios por día
            WITH Fechas AS (
                SELECT CAST(DATEADD(DAY, number, @S) AS DATE) AS Fecha
                FROM master.dbo.spt_values 
                WHERE type = 'P' AND DATEADD(DAY, number, @S) <= @E
            ),
            HorarioEfectivo AS (
                SELECT 
                    f.Fecha,
                    CASE 
                        WHEN ht.TipoAsignacion = 'H' THEN ht.HorarioId
                        WHEN ht.TipoAsignacion = 'T' THEN (SELECT TOP 1 d.HorarioId FROM dbo.CatalogoHorariosDetalle d WHERE d.HorarioDetalleId = ht.HorarioDetalleId)
                        WHEN ht.TipoAsignacion = 'D' THEN NULL -- Descanso
                        WHEN e.EsRotativo = 1 THEN NULL -- Rotativo requiere temporal
                        ELSE e.HorarioIdPredeterminado
                    END AS HorarioId,
                    CASE WHEN ht.TipoAsignacion = 'D' THEN 1 ELSE 0 END AS EsDescansoAsignado
                FROM Fechas f
                CROSS JOIN (
                    SELECT em.HorarioIdPredeterminado, ch.EsRotativo 
                    FROM dbo.Empleados em 
                    LEFT JOIN dbo.CatalogoHorarios ch ON ch.HorarioId = em.HorarioIdPredeterminado
                    WHERE em.EmpleadoId = @EmpId
                ) e
                LEFT JOIN dbo.HorariosTemporales ht ON ht.EmpleadoId = @EmpId AND f.Fecha = ht.Fecha
            )
            SELECT 
                he.Fecha,
                he.HorarioId,
                CAST(hd.HoraEntrada AS VARCHAR(8)) as HoraEntrada,
                CAST(hd.HoraSalida AS VARCHAR(8)) as HoraSalida,
                hd.MinutosAntesEntrada,
                hd.MinutosDespuesSalida,
                hd.EsDiaLaboral,
                he.EsDescansoAsignado,
                h.Nombre as HorarioNombre,
                h.ColorUI
            FROM HorarioEfectivo he
            LEFT JOIN dbo.CatalogoHorarios h ON h.HorarioId = he.HorarioId
            LEFT JOIN dbo.CatalogoHorariosDetalle hd ON hd.HorarioId = he.HorarioId AND hd.DiaSemana = DATEPART(dw, he.Fecha)
            ORDER BY he.Fecha ASC;

            -- 3. Fichas de Asistencia (Estatus del Checador)
            SELECT 
                f.FichaId, f.Fecha, 
                f.EstatusChecadorId,
                f.EstatusManualId,
                ec.Abreviatura AS EstatusChecadorAbrev, 
                ec.ColorUI AS EstatusChecadorColor,
                em.Abreviatura AS EstatusManualAbrev, 
                em.ColorUI AS EstatusManualColor,
                f.Estado,
                f.Comentarios
            FROM dbo.FichaAsistencia f
            LEFT JOIN dbo.CatalogoEstatusAsistencia ec ON ec.EstatusId = f.EstatusChecadorId
            LEFT JOIN dbo.CatalogoEstatusAsistencia em ON em.EstatusId = f.EstatusManualId
            WHERE f.EmpleadoId = @EmpId
              AND f.Fecha BETWEEN @S AND @E
            ORDER BY f.Fecha ASC;
        `;

        const result = await pool.request()
            .input('ParamEmpleadoId', sql.Int, empleadoId)
            .input('ParamStartDate', sql.Date, startDate)
            .input('ParamEndDate', sql.Date, endDate)
            .query(query);

        const recordsets = result.recordsets as any;
        res.json({
            checadas: recordsets[0],
            schedules: recordsets[1],
            fichas: recordsets[2]
        });
    } catch (err: any) {
        console.error('Error al obtener checadas y horarios:', err);
        res.status(500).json({ message: err.message || 'Error al obtener las checadas y horarios.' });
    }
};

export const regenerateAttendance = async (req: any, res: Response) => {
    if (!req.user.permissions['reportesAsistencia.assign']) {
        return res.status(403).json({ message: 'No tienes permiso para regenerar la asistencia.' });
    }

    const { empleadoId, startDate, endDate } = req.body;

    if (!empleadoId || !startDate || !endDate) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos (empleadoId, startDate, endDate).' });
    }

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('FechaInicio', sql.Date, startDate)
            .input('FechaFin', sql.Date, endDate)
            .input('UsuarioId', sql.Int, req.user.usuarioId)
            .input('EmpleadoId', sql.Int, empleadoId)
            .execute('sp_FichasAsistencia_ProcesarChecadas');

        res.status(200).json({ message: 'Registros de asistencia regenerados con éxito.' });
    } catch (err: any) {
        console.error('Error al regenerar asistencia:', err);
        res.status(500).json({ message: err.message || 'Error al regenerar los registros de asistencia.' });
    }
};