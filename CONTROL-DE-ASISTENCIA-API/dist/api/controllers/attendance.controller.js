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
exports.getDataByRange = exports.ensureRange = exports.ensureWeek = exports.approveWeek = exports.saveAttendance = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const saveAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para registrar la asistencia.' });
    }
    const { empleadoId, fecha, estatusSupervisor, comentarios } = req.body;
    if (!empleadoId || !fecha || !estatusSupervisor) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
    }
    console.log(req.body);
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request()
            .input('EmpleadoId', mssql_1.default.Int, empleadoId)
            .input('Fecha', mssql_1.default.Date, new Date(fecha))
            .input('EstatusSupervisorAbrev', mssql_1.default.NVarChar, estatusSupervisor)
            .input('Comentarios', mssql_1.default.NVarChar, comentarios || null)
            .input('SupervisorId', mssql_1.default.Int, req.user.usuarioId)
            .execute('sp_FichasAsistencia_SaveSupervisor');
        res.status(200).json({ message: 'Registro guardado con éxito.' });
    }
    catch (err) {
        console.error('Error al guardar registro de asistencia:', err);
        res.status(500).json({ message: err.message || 'Error al guardar el registro.' });
    }
});
exports.saveAttendance = saveAttendance;
const approveWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para aprobar la asistencia.' });
    }
    const { empleadoId, weekStartDate } = req.body;
    if (!empleadoId || !weekStartDate) {
        return res.status(400).json({ message: 'Faltan parámetros requeridos.' });
    }
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request()
            .input('SupervisorId', mssql_1.default.Int, req.user.usuarioId)
            .input('EmpleadoId', mssql_1.default.Int, empleadoId)
            .input('FechaInicioSemana', mssql_1.default.Date, new Date(weekStartDate))
            .execute('sp_FichasAsistencia_ApproveWeek');
        res.status(200).json({ message: 'Semana aprobada correctamente.' });
    }
    catch (err) {
        console.error('Error en la aprobación rápida:', err);
        res.status(500).json({ message: err.message || 'Error al aprobar la semana.' });
    }
});
exports.approveWeek = approveWeek;
const ensureWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['reportesAsistencia.update']) {
        return res.status(403).json({ message: 'No tienes permiso para realizar esta acción.' });
    }
    const { weekStartDate } = req.body;
    if (!weekStartDate) {
        return res.status(400).json({ message: 'Falta la fecha de inicio de semana.' });
    }
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, req.user.usuarioId)
            .input('FechaInicioSemana', mssql_1.default.Date, new Date(weekStartDate))
            .execute('sp_FichasAsistencia_ProcessWeekForSupervisor');
        res.status(200).json({ message: 'Semana procesada y preparada correctamente.' });
    }
    catch (err) {
        console.error('Error al procesar la semana:', err);
        res.status(500).json({ message: err.message || 'Error al preparar los datos de la semana.' });
    }
});
exports.ensureWeek = ensureWeek;
const ensureRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['reportesAsistencia.update'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.body;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request()
            .input('FechaInicio', mssql_1.default.Date, startDate).input('FechaFin', mssql_1.default.Date, endDate)
            .input('UsuarioId', mssql_1.default.Int, req.user.usuarioId).execute('sp_FichasAsistencia_ProcesarChecadas');
        res.status(200).json({ message: 'Rango de fechas procesado.' });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al procesar el rango.' });
    }
});
exports.ensureRange = ensureRange;
const getDataByRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['reportesAsistencia.read.own'] && !req.user.permissions['reportesAsistencia.read.all']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    const { startDate, endDate, filters // { departamentos: [1, 2], gruposNomina: [3], puestos: [], establecimientos: [] }
     } = req.body;
    // Helper para convertir un array de IDs (o undefined) en un string JSON para el SP
    const toJSONString = (arr) => {
        if (!arr || arr.length === 0)
            return '[]'; // Enviar '[]' si está vacío
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
