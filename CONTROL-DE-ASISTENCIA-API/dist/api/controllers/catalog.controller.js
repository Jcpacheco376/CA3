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
exports.deleteScheduleCatalog = exports.upsertScheduleCatalog = exports.getSchedulesCatalog = exports.upsertAttendanceStatus = exports.getAttendanceStatusesManagement = exports.getAttendanceStatuses = exports.saveGrupoNomina = exports.getGruposNominaManagement = exports.saveDepartamento = exports.getDepartamentosManagement = exports.getGruposNomina = exports.getDepartamentos = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const getDepartamentos = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.departamentos.read'])
        return res.status(403).json({ message: 'No tienes permiso para ver los departamentos.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().query('SELECT DepartamentoId, Nombre FROM CatalogoDepartamentos WHERE Activo=1');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener departamentos.' });
    }
});
exports.getDepartamentos = getDepartamentos;
const getGruposNomina = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.gruposNomina.read'])
        return res.status(403).json({ message: 'No tienes permiso para ver los grupos de nómina.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().query('SELECT GrupoNominaId, Nombre FROM CatalogoGruposNomina WHERE Activo=1');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener grupos de nómina.' });
    }
});
exports.getGruposNomina = getGruposNomina;
const getDepartamentosManagement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.departamentos.manage'])
        return res.status(403).json({ message: 'No tienes permiso para gestionar departamentos.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_Departamentos_GetAllManagement');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener datos de gestión de deptos.' });
    }
});
exports.getDepartamentosManagement = getDepartamentosManagement;
const saveDepartamento = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.departamentos.manage'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    const { departamento, nombre, abreviatura, status } = req.body;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request().input('DepartamentoId', mssql_1.default.NVarChar, departamento).input('Nombre', mssql_1.default.NVarChar, nombre)
            .input('Abreviatura', mssql_1.default.NVarChar, abreviatura).input('Status', mssql_1.default.NVarChar, status).execute('sp_Departamentos_Save');
        res.status(201).json({ message: 'Departamento guardado con éxito' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error al guardar el departamento.' });
    }
});
exports.saveDepartamento = saveDepartamento;
const getGruposNominaManagement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.gruposNomina.manage'])
        return res.status(403).json({ message: 'No tienes permiso para gestionar grupos.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_GruposNomina_GetAllManagement');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener datos de gestión de grupos.' });
    }
});
exports.getGruposNominaManagement = getGruposNominaManagement;
const saveGrupoNomina = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.grupos_nomina.manage'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    const { grupo_nomina, nombre, abreviatura, status } = req.body;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request().input('GrupoNominaId', mssql_1.default.NVarChar, grupo_nomina).input('Nombre', mssql_1.default.NVarChar, nombre)
            .input('Abreviatura', mssql_1.default.NVarChar, abreviatura).input('Activo', mssql_1.default.Bit, status).execute('sp_GruposNomina_Save');
        res.status(201).json({ message: 'Grupo de nómina guardado con éxito' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error al guardar el grupo de nómina.' });
    }
});
exports.saveGrupoNomina = saveGrupoNomina;
const getAttendanceStatuses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().query('SELECT * FROM dbo.CatalogoEstatusAsistencia WHERE Activo = 1');
        res.json(result.recordset);
    }
    catch (err) {
        console.error('Error al obtener el catálogo de estatus:', err);
        res.status(500).json({ message: 'Error al obtener el catálogo de estatus.' });
    }
});
exports.getAttendanceStatuses = getAttendanceStatuses;
const getAttendanceStatusesManagement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.estatusAsistencia.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para gestionar este catálogo.' });
    }
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_CatalogoEstatusAsistencia_GetAllManagement');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener el catálogo de estatus para gestión.' });
    }
});
exports.getAttendanceStatusesManagement = getAttendanceStatusesManagement;
const upsertAttendanceStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.estatusAsistencia.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para gestionar este catálogo.' });
    }
    const { EstatusId, Abreviatura, Descripcion, ColorUI, ValorNomina, VisibleSupervisor, Activo, Tipo, EsFalta, EsRetardo, EsEntradaSalidaIncompleta, EsAsistencia, DiasRegistroFuturo, PermiteComentario } = req.body;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request()
            .input('EstatusId', mssql_1.default.Int, EstatusId || 0)
            .input('Abreviatura', mssql_1.default.NVarChar, Abreviatura)
            .input('Descripcion', mssql_1.default.NVarChar, Descripcion)
            .input('ColorUI', mssql_1.default.NVarChar, ColorUI)
            .input('ValorNomina', mssql_1.default.Decimal(3, 2), ValorNomina)
            .input('VisibleSupervisor', mssql_1.default.Bit, VisibleSupervisor)
            .input('Activo', mssql_1.default.Bit, Activo)
            .input('Tipo', mssql_1.default.NVarChar, Tipo)
            .input('EsFalta', mssql_1.default.Bit, EsFalta)
            .input('EsRetardo', mssql_1.default.Bit, EsRetardo)
            .input('EsEntradaSalidaIncompleta', mssql_1.default.Bit, EsEntradaSalidaIncompleta)
            .input('EsAsistencia', mssql_1.default.Bit, EsAsistencia)
            .input('DiasRegistroFuturo', mssql_1.default.Int, DiasRegistroFuturo)
            .input('PermiteComentario', mssql_1.default.Bit, PermiteComentario)
            .execute('sp_CatalogoEstatusAsistencia_Upsert');
        res.status(200).json({ message: 'Estatus guardado correctamente.' });
    }
    catch (err) {
        res.status(409).json({ message: err.message });
    }
});
exports.upsertAttendanceStatus = upsertAttendanceStatus;
const getSchedulesCatalog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.horarios.read'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_CatalogoHorarios_GetForManagement');
        const horarios = result.recordset.map(h => (Object.assign(Object.assign({}, h), { Detalles: h.Detalles ? JSON.parse(h.Detalles) : [] })));
        res.json(horarios);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener el catálogo de horarios.', error: err.message });
    }
});
exports.getSchedulesCatalog = getSchedulesCatalog;
const upsertScheduleCatalog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.horarios.manage'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    const { HorarioId, Abreviatura, Nombre, MinutosTolerancia, ColorUI, Activo, EsRotativo, Detalles } = req.body;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        console.log(req.body);
        const result = yield pool.request()
            .input('HorarioId', mssql_1.default.Int, HorarioId || 0)
            .input('Abreviatura', mssql_1.default.NVarChar, Abreviatura)
            .input('Nombre', mssql_1.default.NVarChar, Nombre)
            .input('MinutosTolerancia', mssql_1.default.Int, MinutosTolerancia)
            .input('ColorUI', mssql_1.default.NVarChar, ColorUI)
            .input('Activo', mssql_1.default.Bit, Activo)
            .input('esRotativo', mssql_1.default.Bit, EsRotativo)
            .input('DetallesJSON', mssql_1.default.NVarChar, JSON.stringify(Detalles || [])).execute('sp_CatalogoHorarios_Upsert');
        res.status(200).json({ message: 'Horario guardado correctamente.', horarioId: result.recordset[0].HorarioId });
    }
    catch (err) {
        res.status(409).json({ message: err.message });
    }
});
exports.upsertScheduleCatalog = upsertScheduleCatalog;
const deleteScheduleCatalog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.horarios.manage'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request().input('HorarioId', mssql_1.default.Int, req.params.horarioId).execute('sp_CatalogoHorarios_Delete');
        res.status(200).json({ message: 'Horario desactivado correctamente.' });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
exports.deleteScheduleCatalog = deleteScheduleCatalog;
