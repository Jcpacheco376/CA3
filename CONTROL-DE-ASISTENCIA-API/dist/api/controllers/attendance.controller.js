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
exports.getDataByRange = exports.approveWeek = exports.saveAttendance = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const saveAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request()
            .input('EmpleadoId', mssql_1.default.Int, empleadoId)
            .input('Fecha', mssql_1.default.Date, new Date(fecha))
            .input('EstatusManualAbrev', mssql_1.default.NVarChar, estatusManual || null) // Enviamos NULL si no hay estatus
            .input('Comentarios', mssql_1.default.NVarChar, comentarios || null)
            .input('UsuarioId', mssql_1.default.Int, req.user.usuarioId)
            .execute('sp_FichasAsistencia_SaveManual');
        const action = estatusManual ? 'guardado' : 'restaurado';
        res.status(200).json({ message: `Registro ${action} con éxito.` });
    }
    catch (err) {
        console.error('Error al guardar registro manual:', err);
        res.status(500).json({ message: err.message || 'Error al guardar el registro.' });
    }
});
exports.saveAttendance = saveAttendance;
// ... (Resto de funciones: approveWeek, getDataByRange se mantienen igual)
const approveWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, req.user.usuarioId)
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
const getDataByRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // ... código existente ...
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
