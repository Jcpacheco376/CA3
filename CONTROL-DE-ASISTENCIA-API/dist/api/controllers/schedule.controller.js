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
    // Los parámetros ahora vienen del BODY
    const { startDate, endDate, filters } = req.body;
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }
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
            // Nuevos parámetros de filtro
            .input('DepartamentoFiltro', mssql_1.default.NVarChar, toJSONString(filters === null || filters === void 0 ? void 0 : filters.departamentos))
            .input('GrupoNominaFiltro', mssql_1.default.NVarChar, toJSONString(filters === null || filters === void 0 ? void 0 : filters.gruposNomina))
            .input('PuestoFiltro', mssql_1.default.NVarChar, toJSONString(filters === null || filters === void 0 ? void 0 : filters.puestos))
            .input('EstablecimientoFiltro', mssql_1.default.NVarChar, toJSONString(filters === null || filters === void 0 ? void 0 : filters.establecimientos))
            .execute('sp_HorariosTemporales_GetByPeriodo');
        const processedResults = result.recordset.map(emp => (Object.assign(Object.assign({}, emp), { HorariosAsignados: emp.HorariosAsignados ? JSON.parse(emp.HorariosAsignados) : [] })));
        res.json(processedResults);
    }
    catch (err) {
        console.error("Error en getScheduleAssignments:", err);
        res.status(500).json({ message: err.message || 'Error al obtener los datos.' });
    }
});
exports.getScheduleAssignments = getScheduleAssignments;
// saveScheduleAssignments CORREGIDO (eliminado .rolledBack)
const saveScheduleAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['horarios.assign'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    // El body ahora es un array de objetos con la nueva estructura
    const assignments = req.body;
    if (!Array.isArray(assignments)) {
        return res.status(400).json({ message: 'Se esperaba un arreglo de asignaciones.' });
    }
    // Filtrar asignaciones inválidas (por si acaso)
    const validAssignments = assignments.filter(a => a.empleadoId && a.fecha);
    if (validAssignments.length === 0) {
        return res.status(400).json({ message: 'No hay asignaciones válidas para procesar.' });
    }
    let pool = null; // Definir pool fuera del try para usarlo en finally
    let transaction = null; // Definir transaction fuera del try
    try {
        pool = yield mssql_1.default.connect(database_1.dbConfig);
        transaction = new mssql_1.default.Transaction(pool);
        yield transaction.begin();
        console.log(`Iniciando transacción para ${validAssignments.length} asignaciones.`); // Log
        // Usar un bucle for...of con await
        for (const assignment of validAssignments) {
            const { empleadoId, fecha, tipoAsignacion, horarioId, detalleId } = assignment;
            // Log detallado de cada asignación
            console.log(`Procesando: Empleado ${empleadoId}, Fecha ${fecha}, Tipo ${tipoAsignacion}, HorarioId ${horarioId}, DetalleId ${detalleId}`);
            // Crear una NUEVA request DENTRO del bucle para cada llamada
            const request = new mssql_1.default.Request(transaction);
            request.input('EmpleadoId', mssql_1.default.Int, empleadoId);
            request.input('Fecha', mssql_1.default.Date, new Date(fecha));
            request.input('UsuarioId', mssql_1.default.Int, req.user.usuarioId);
            request.input('TipoAsignacion', mssql_1.default.Char(1), tipoAsignacion);
            request.input('HorarioId', mssql_1.default.Int, tipoAsignacion === 'H' ? horarioId : null);
            request.input('HorarioDetalleId', mssql_1.default.Int, tipoAsignacion === 'T' ? detalleId : null);
            yield request.execute('sp_HorariosTemporales_Upsert');
            console.log(` -> Completado: Empleado ${empleadoId}, Fecha ${fecha}`); // Log
        }
        console.log("Todas las operaciones completadas, haciendo commit..."); // Log
        yield transaction.commit();
        console.log("Commit exitoso."); // Log
        res.status(200).json({ message: 'Asignaciones guardadas correctamente.' });
    }
    catch (err) {
        console.error('Error durante la transacción:', err); // Log del error
        // Intentar rollback solo si la transacción existe
        // ¡FIX! Se elimina la comprobación de '.rolledBack'
        if (transaction) {
            console.log("Intentando rollback..."); // Log
            try {
                yield transaction.rollback();
                console.log("Rollback exitoso."); // Log
            }
            catch (rollbackErr) {
                // Loguear el error de rollback, pero devolver el error original
                console.error('Error durante el rollback:', rollbackErr);
            }
        }
        res.status(500).json({ message: err.message || 'Error al guardar las asignaciones.' });
    }
    finally {
        // Asegurarse de cerrar la conexión si se abrió
        if (pool && pool.connected) {
            try {
                yield pool.close();
                console.log("Conexión cerrada."); // Log
            }
            catch (closeErr) {
                console.error("Error al cerrar la conexión:", closeErr);
            }
        }
    }
});
exports.saveScheduleAssignments = saveScheduleAssignments;
