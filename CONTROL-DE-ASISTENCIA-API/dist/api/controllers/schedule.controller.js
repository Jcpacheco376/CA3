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
exports.saveScheduleAssignments = exports.getScheduleAssignments = exports.getSchedules = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const getSchedules = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['horarios.read'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_Horarios_GetAll');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener catálogo de horarios.', error: err.message });
    }
});
exports.getSchedules = getSchedules;
const getScheduleAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['horarios.read'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate)
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    console.log(req.query);
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, req.user.usuarioId)
            .input('FechaInicio', mssql_1.default.Date, startDate)
            .input('FechaFin', mssql_1.default.Date, endDate)
            .execute('sp_HorariosTemporales_GetByPeriodo');
        res.json(result.recordset.map(emp => (Object.assign(Object.assign({}, emp), { HorariosAsignados: emp.HorariosAsignados ? JSON.parse(emp.HorariosAsignados) : [] }))));
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al obtener los datos.' });
    }
});
exports.getScheduleAssignments = getScheduleAssignments;
const saveScheduleAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['horarios.assign'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    const assignments = req.body;
    if (!Array.isArray(assignments))
        return res.status(400).json({ message: 'Se esperaba un arreglo de asignaciones.' });
    const pool = yield mssql_1.default.connect(database_1.dbConfig);
    const transaction = new mssql_1.default.Transaction(pool);
    console.log(assignments);
    try {
        yield transaction.begin();
        yield Promise.all(assignments.map((assignment) => __awaiter(void 0, void 0, void 0, function* () {
            const { empleadoId, fecha, horarioId } = assignment;
            if (!empleadoId || !fecha)
                return;
            yield new mssql_1.default.Request(transaction)
                .input('EmpleadoId', mssql_1.default.Int, empleadoId).input('Fecha', mssql_1.default.Date, new Date(fecha))
                .input('HorarioId', mssql_1.default.Int, horarioId).input('SupervisorId', mssql_1.default.Int, req.user.usuarioId)
                .execute('sp_HorariosTemporales_Upsert');
        })));
        yield transaction.commit();
        res.status(200).json({ message: 'Asignaciones guardadas correctamente.' });
    }
    catch (err) {
        yield transaction.rollback();
        console.error('Error al guardar las asignaciones:', err);
        res.status(500).json({ message: err.message || 'Error al guardar las asignaciones.' });
    }
});
exports.saveScheduleAssignments = saveScheduleAssignments;
