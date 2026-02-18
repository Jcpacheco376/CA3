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
exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployees = exports.getEmployeeProfile = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const getEmployeeProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['usuarios.read'] &&
        !req.user.permissions['reportesAsistencia.read.own'] &&
        !req.user.permissions['horarios.read'] &&
        !req.user.permissions['catalogo.empleados.read'] &&
        !req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver perfiles de empleado.' });
    }
    const { employeeId } = req.params;
    if (!employeeId)
        return res.status(400).json({ message: 'El ID del empleado es requerido.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().input('EmpleadoId', mssql_1.default.Int, employeeId).execute('sp_Empleados_GetDatos');
        if (result.recordset.length === 0)
            return res.status(404).json({ message: 'Empleado no encontrado.' });
        res.json(result.recordset[0]);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al obtener la información del empleado.' });
    }
});
exports.getEmployeeProfile = getEmployeeProfile;
const getEmployees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.empleados.read'] && !req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para ver los empleados.' });
    }
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('dbo.sp_Empleados_GetAll');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al obtener empleados.' });
    }
});
exports.getEmployees = getEmployees;
const createEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para crear empleados.' });
    }
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const request = pool.request();
        // Add inputs based on sp_Empleados_Insert
        request.input('CodRef', mssql_1.default.NVarChar, req.body.CodRef);
        request.input('NombreCompleto', mssql_1.default.NVarChar, req.body.NombreCompleto);
        request.input('FechaNacimiento', mssql_1.default.Date, req.body.FechaNacimiento);
        request.input('FechaIngreso', mssql_1.default.Date, req.body.FechaIngreso);
        request.input('DepartamentoId', mssql_1.default.Int, req.body.DepartamentoId);
        request.input('GrupoNominaId', mssql_1.default.Int, req.body.GrupoNominaId);
        request.input('PuestoId', mssql_1.default.Int, req.body.PuestoId);
        request.input('HorarioIdPredeterminado', mssql_1.default.Int, req.body.HorarioIdPredeterminado);
        request.input('EstablecimientoId', mssql_1.default.Int, req.body.EstablecimientoId);
        request.input('Sexo', mssql_1.default.NChar, req.body.Sexo);
        request.input('NSS', mssql_1.default.NVarChar, req.body.NSS);
        request.input('CURP', mssql_1.default.NVarChar, req.body.CURP);
        request.input('RFC', mssql_1.default.NVarChar, req.body.RFC);
        // Image handling might need specific logic (base64 to binary)
        if (req.body.Imagen) {
            request.input('Imagen', mssql_1.default.VarBinary, Buffer.from(req.body.Imagen, 'base64'));
        }
        request.input('Activo', mssql_1.default.Bit, req.body.Activo);
        const result = yield request.execute('dbo.sp_Empleados_Insert');
        res.status(201).json({ message: 'Empleado creado correctamente.', empleadoId: result.recordset[0].EmpleadoId });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al crear empleado.' });
    }
});
exports.createEmployee = createEmployee;
const updateEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para actualizar empleados.' });
    }
    const { employeeId } = req.params;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const request = pool.request();
        request.input('EmpleadoId', mssql_1.default.Int, employeeId);
        request.input('CodRef', mssql_1.default.NVarChar, req.body.CodRef);
        request.input('NombreCompleto', mssql_1.default.NVarChar, req.body.NombreCompleto);
        request.input('FechaNacimiento', mssql_1.default.Date, req.body.FechaNacimiento);
        request.input('FechaIngreso', mssql_1.default.Date, req.body.FechaIngreso);
        request.input('DepartamentoId', mssql_1.default.Int, req.body.DepartamentoId);
        request.input('GrupoNominaId', mssql_1.default.Int, req.body.GrupoNominaId);
        request.input('PuestoId', mssql_1.default.Int, req.body.PuestoId);
        request.input('HorarioIdPredeterminado', mssql_1.default.Int, req.body.HorarioIdPredeterminado);
        request.input('EstablecimientoId', mssql_1.default.Int, req.body.EstablecimientoId);
        request.input('Sexo', mssql_1.default.NChar, req.body.Sexo);
        request.input('NSS', mssql_1.default.NVarChar, req.body.NSS);
        request.input('CURP', mssql_1.default.NVarChar, req.body.CURP);
        request.input('RFC', mssql_1.default.NVarChar, req.body.RFC);
        if (req.body.Imagen) {
            request.input('Imagen', mssql_1.default.VarBinary, Buffer.from(req.body.Imagen, 'base64'));
        }
        request.input('Activo', mssql_1.default.Bit, req.body.Activo);
        yield request.execute('dbo.sp_Empleados_Update');
        res.json({ message: 'Empleado actualizado correctamente.' });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al actualizar empleado.' });
    }
});
exports.updateEmployee = updateEmployee;
const deleteEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para eliminar empleados.' });
    }
    const { employeeId } = req.params;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request().input('EmpleadoId', mssql_1.default.Int, employeeId).execute('dbo.sp_Empleados_Delete');
        res.json({ message: 'Empleado eliminado correctamente.' });
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al eliminar empleado.' });
    }
});
exports.deleteEmployee = deleteEmployee;
