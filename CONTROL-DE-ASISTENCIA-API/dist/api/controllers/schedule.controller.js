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
exports.saveScheduleAssignments = exports.validateScheduleBatch = exports.getScheduleAssignments = exports.getSchedules = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
// No necesitas importar 'Console'
// getSchedules se mantiene igual...
const getSchedules = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['horarios.read'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        // Asegúrate que llamas al SP correcto que devuelve los detalles/turnos
        const result = yield pool.request().execute('sp_Horarios_GetAll'); // Este SP devuelve los Turnos JSON
        // Parsear el JSON de Turnos devuelto por el SP modificado
        const horarios = result.recordset.map(h => (Object.assign(Object.assign({}, h), { Turnos: h.Turnos ? JSON.parse(h.Turnos) : [] })));
        res.json(horarios);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener catálogo de horarios.', error: err.message });
    }
});
exports.getSchedules = getSchedules;
// getScheduleAssignments se mantiene igual...
const getScheduleAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['horarios.read']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    const { startDate, endDate, filters } = req.body;
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }
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
            .execute('sp_HorariosTemporales_GetByPeriodo');
        const processedResults = result.recordset.map(emp => (Object.assign(Object.assign({}, emp), { 
            // Parseamos los Horarios (Asignaciones)
            HorariosAsignados: emp.HorariosAsignados ? JSON.parse(emp.HorariosAsignados) : [], 
            // NUEVO: Parseamos los Estados de las Fichas
            FichasExistentes: emp.FichasExistentes ? JSON.parse(emp.FichasExistentes) : [] })));
        res.json(processedResults);
    }
    catch (err) {
        console.error("Error en getScheduleAssignments:", err);
        res.status(500).json({ message: err.message || 'Error al obtener los datos.' });
    }
});
exports.getScheduleAssignments = getScheduleAssignments;
const validateScheduleBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Validación de permisos
    if (!req.user.permissions['horarios.assign'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    const assignments = Array.isArray(req.body) ? req.body : (req.body.assignments || []);
    const validAssignments = assignments.filter((a) => a.empleadoId && a.fecha);
    if (validAssignments.length === 0)
        return res.json({ status: 'OK' });
    let pool = null;
    try {
        pool = yield mssql_1.default.connect(database_1.dbConfig);
        let hasValidated = false;
        // Iteramos para verificar el estado de cada día
        for (const assignment of validAssignments) {
            const { empleadoId, fecha } = assignment;
            const request = new mssql_1.default.Request(pool);
            request.input('EmpId', mssql_1.default.Int, empleadoId);
            request.input('Fecha', mssql_1.default.Date, new Date(fecha));
            // Consultamos el estado directo de la ficha
            const result = yield request.query(`
                SELECT Estado 
                FROM dbo.FichaAsistencia 
                WHERE EmpleadoId = @EmpId AND Fecha = @Fecha
            `);
            const estado = (_a = result.recordset[0]) === null || _a === void 0 ? void 0 : _a.Estado;
            if (estado === 'BLOQUEADO') {
                // Si encontramos UN SOLO día bloqueado, detenemos todo.
                return res.json({
                    status: 'BLOCKING_ERROR',
                    message: `El empleado ${empleadoId} tiene el día ${fecha} en un periodo CERRADO (Bloqueado). No se pueden aplicar cambios.`
                });
            }
            if (estado === 'VALIDADO') {
                hasValidated = true;
            }
        }
        // Si pasamos el bucle sin errores bloqueantes, revisamos si hubo advertencias
        if (hasValidated) {
            return res.json({
                status: 'CONFIRMATION_REQUIRED',
                message: 'Existen fichas ya VALIDADAS en el rango seleccionado. Se requiere confirmación para regenerarlas.'
            });
        }
        // Si todo está limpio
        return res.json({ status: 'OK' });
    }
    catch (err) {
        console.error("Error en validación:", err);
        return res.status(500).json({ message: 'Error interno al validar el periodo.' });
    }
    finally {
        if (pool && pool.connected)
            yield pool.close();
    }
});
exports.validateScheduleBatch = validateScheduleBatch;
const saveScheduleAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['horarios.assign'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    const assignments = Array.isArray(req.body) ? req.body : (req.body.assignments || []);
    const validAssignments = assignments.filter((a) => a.empleadoId && a.fecha);
    if (validAssignments.length === 0)
        return res.status(400).json({ message: 'Sin datos.' });
    let pool = null;
    let transaction = null;
    try {
        pool = yield mssql_1.default.connect(database_1.dbConfig);
        transaction = new mssql_1.default.Transaction(pool);
        yield transaction.begin();
        for (const assignment of validAssignments) {
            const { empleadoId, fecha, tipoAsignacion, horarioId, detalleId } = assignment;
            const request = new mssql_1.default.Request(transaction);
            request.input('EmpleadoId', mssql_1.default.Int, empleadoId);
            request.input('Fecha', mssql_1.default.Date, new Date(fecha));
            request.input('UsuarioId', mssql_1.default.Int, req.user.usuarioId);
            request.input('TipoAsignacion', mssql_1.default.Char(1), tipoAsignacion || null);
            request.input('HorarioId', mssql_1.default.Int, (tipoAsignacion === 'H' ? horarioId : null) || null);
            request.input('HorarioDetalleId', mssql_1.default.Int, (tipoAsignacion === 'T' ? detalleId : null) || null);
            yield request.execute('sp_HorariosTemporales_Upsert');
        }
        yield transaction.commit();
        res.status(200).json({ message: 'Guardado correctamente.' });
    }
    catch (err) {
        if (transaction) {
            try {
                yield transaction.rollback();
            }
            catch (e) { }
        }
        // El SP aún puede lanzar 51000 si intentan saltarse la validación
        if (err.number === 51000) {
            return res.status(409).json({ error: 'BLOCKING_ERROR', message: err.message });
        }
        console.error('Error saveScheduleAssignments:', err);
        res.status(500).json({ message: err.message || 'Error interno.' });
    }
    finally {
        if (pool && pool.connected)
            yield pool.close();
    }
});
exports.saveScheduleAssignments = saveScheduleAssignments;
