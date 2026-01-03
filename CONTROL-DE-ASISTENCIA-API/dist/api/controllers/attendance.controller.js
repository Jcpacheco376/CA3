"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDataByRange = exports.saveAttendance = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const saveAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        // 3. Ejecutar SP
        const result = yield pool.request()
            .input('EmpleadoId', mssql_1.default.Int, empleadoId)
            .input('Fecha', mssql_1.default.Date, new Date(fecha))
            .input('EstatusManualAbrev', mssql_1.default.NVarChar, estatusManual || null) // Null si es deshacer
            .input('Comentarios', mssql_1.default.NVarChar, comentarios || null)
            .input('UsuarioId', mssql_1.default.Int, req.user.usuarioId)
            .execute('sp_FichasAsistencia_SaveManual');
        // 4. Capturar la Ficha Actualizada (Sincronización Bidireccional)
        // El SP ahora hace un SELECT al final con el estado real (incluyendo IncidenciaActivaId)
        const updatedFicha = result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
        const action = estatusManual ? 'guardado' : 'restaurado';
        res.status(200).json({
            message: `Registro ${action} con éxito.`,
            data: updatedFicha
        });
    }
    catch (err) {
        console.error('Error al guardar registro manual:', err);
        // Manejo de errores específicos de SQL (ej. Bloqueo)
        if (err.message && err.message.includes('CERRADO')) {
            return res.status(409).json({ message: err.message }); // 409 Conflict
        }
        res.status(500).json({ message: err.message || 'Error al guardar el registro.' });
    }
});
exports.saveAttendance = saveAttendance;
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
const getDataByRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['reportesAsistencia.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    const { startDate, endDate, filters } = req.body;
    const toJSONString = (arr) => {
        if (!arr || arr.length === 0)
            return '[]';
        return JSON.stringify(arr);
    };
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, req.user.usuarioId)
            .input('FechaInicio', mssql_1.default.Date, startDate)
            .input('FechaFin', mssql_1.default.Date, endDate)
            .input('DepartamentoFiltro', mssql_1.default.NVarChar, toJSONString(filters === null || filters === void 0 ? void 0 : filters.departamentos))
            .input('GrupoNominaFiltro', mssql_1.default.NVarChar, toJSONString(filters === null || filters === void 0 ? void 0 : filters.gruposNomina))
            .input('PuestoFiltro', mssql_1.default.NVarChar, toJSONString(filters === null || filters === void 0 ? void 0 : filters.puestos))
            .input('EstablecimientoFiltro', mssql_1.default.NVarChar, toJSONString(filters === null || filters === void 0 ? void 0 : filters.establecimientos))
            .execute('sp_FichasAsistencia_GetDataByRange');
        res.json(result.recordset.map(emp => (Object.assign(Object.assign({}, emp), { FichasSemana: emp.FichasSemana ? JSON.parse(emp.FichasSemana) : [] }))));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al obtener los datos de asistencia.' });
    }
});
exports.getDataByRange = getDataByRange;
