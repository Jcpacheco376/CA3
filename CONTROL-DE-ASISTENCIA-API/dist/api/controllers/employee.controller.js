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
exports.getPermittedEmployees = exports.getAnniversaries = exports.getBirthdays = exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployeePhoto = exports.getEmployeeStats = exports.getEmployees = exports.getEmployeeProfile = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const getEmployeeProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const msg = `--- [DEBUG] getEmployeeProfile CALLED with ID: ${req.params.employeeId}\n`;
    require('fs').appendFileSync(require('path').join(process.env.TEMP || 'C:\\Windows\\Temp', 'api_debug.log'), msg);
    res.setHeader('X-API-Version', 'DEBUG-1');
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
        const employee = result.recordset[0];
        if (employee.Zonas) {
            try {
                employee.Zonas = JSON.parse(employee.Zonas);
            }
            catch (e) {
                console.error("Error parsing Zonas JSON", e);
                employee.Zonas = [];
            }
        }
        else {
            employee.Zonas = [];
        }
        res.json(employee);
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
        const includeInactive = req.query.includeInactive === 'true' ? 1 : 0;
        const result = yield pool.request()
            .input('IncluirInactivos', mssql_1.default.Bit, includeInactive)
            .execute('dbo.sp_Empleados_GetAllManagement');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al obtener empleados.' });
    }
});
exports.getEmployees = getEmployees;
const getEmployeeStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['catalogo.empleados.read'] && !req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('dbo.sp_Empleados_GetStats');
        res.json(result.recordset[0]);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al obtener estadísticas.' });
    }
});
exports.getEmployeeStats = getEmployeeStats;
const getEmployeePhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Both read and manage permissions can view photos
    if (!req.user.permissions['catalogo.empleados.read'] && !req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso.' });
    }
    const { employeeId } = req.params;
    if (!employeeId)
        return res.status(400).send('El ID del empleado es requerido.');
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request()
            .input('EmpleadoId', mssql_1.default.Int, employeeId)
            .query('SELECT Imagen FROM dbo.Empleados WHERE EmpleadoId = @EmpleadoId');
        if (result.recordset.length === 0 || !result.recordset[0].Imagen) {
            return res.status(404).send('Foto no encontrada.');
        }
        const imageBuffer = result.recordset[0].Imagen;
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        res.send(imageBuffer);
    }
    catch (err) {
        console.error('Error fetching photo:', err);
        res.status(500).send('Error al obtener la foto.');
    }
});
exports.getEmployeePhoto = getEmployeePhoto;
const createEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.user.permissions['catalogo.empleados.manage']) {
        return res.status(403).json({ message: 'No tienes permiso para crear empleados.' });
    }
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const request = pool.request();
        // New Fields
        request.input('CodRef', mssql_1.default.NVarChar, req.body.CodRef);
        request.input('Pim', mssql_1.default.NVarChar, req.body.Pim ? String(req.body.Pim) : null);
        request.input('Nombres', mssql_1.default.NVarChar, req.body.Nombres);
        request.input('ApellidoPaterno', mssql_1.default.NVarChar, req.body.ApellidoPaterno);
        request.input('ApellidoMaterno', mssql_1.default.NVarChar, req.body.ApellidoMaterno || '');
        // NombreCompleto is calculated in SP
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
        request.input('UsuarioId', mssql_1.default.Int, req.user.usuarioId);
        // Image handling
        if (req.body.Imagen) {
            request.input('Imagen', mssql_1.default.VarBinary, Buffer.from(req.body.Imagen, 'base64'));
        }
        else {
            request.input('Imagen', mssql_1.default.VarBinary, null);
        }
        request.input('Activo', mssql_1.default.Bit, (_a = req.body.Activo) !== null && _a !== void 0 ? _a : true);
        // EmpleadoId is OUTPUT for Insert (NULL input, New ID output)
        request.output('EmpleadoId', mssql_1.default.Int);
        const result = yield request.execute('dbo.sp_Empleados_Save');
        res.status(201).json({ message: 'Empleado creado correctamente.', id: result.output.EmpleadoId });
    }
    catch (err) {
        if (err.number === 2627)
            return res.status(409).json({ message: 'El Código ya existe.' });
        // Custom error from SP
        if (err.message && err.message.includes('El código de referencia ya existe')) {
            return res.status(409).json({ message: err.message });
        }
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
        request.input('Pim', mssql_1.default.NVarChar, req.body.Pim ? String(req.body.Pim) : null);
        request.input('Nombres', mssql_1.default.NVarChar, req.body.Nombres);
        request.input('ApellidoPaterno', mssql_1.default.NVarChar, req.body.ApellidoPaterno);
        request.input('ApellidoMaterno', mssql_1.default.NVarChar, req.body.ApellidoMaterno || '');
        // NombreCompleto calculated
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
        request.input('UsuarioId', mssql_1.default.Int, req.user.usuarioId);
        if (req.body.Imagen) {
            request.input('Imagen', mssql_1.default.VarBinary, Buffer.from(req.body.Imagen, 'base64'));
        }
        else {
            // Logic for image update: if undefined, often we don't send it to SP if SP supports optional update
            // But our SP updates everything. So we must decide.
            // If the user didn't change image, frontend usually sends nothing or existing?
            // Let's assume passed null = delete, undefined = keep?
            // Actually, for simplicity and safety: if not provided (undefined), pass null (erase) OR verify stored proc logic
            // The SP `UPDATE ... SET Imagen = @Imagen` will erase it if we pass NULL.
            // So if req.body.Imagen is missing, we might be erasing it unintentionally if we are not careful.
            // However, usually detailed forms fetch everything and send everything back.
            // Let's pass NULL if missing for now, mimicking previous behavior logic (sort of).
            // Better: Check if `Imagen` key exists in body. 
            if (req.body.Imagen === null)
                request.input('Imagen', mssql_1.default.VarBinary, null);
            // If undefined, do we pass null? Yes, let's stick to safe "send what we have"
        }
        request.input('Activo', mssql_1.default.Bit, req.body.Activo);
        // Pass EmpleadoId as Input for Update. 
        // Note: SP defines it as OUTPUT but accepts input value. 
        // We don't need to read it back for update, so just Input is fine in mssql usually.
        // However, to be safe and match the signature, we can use output with value?
        // Actually, request.input works fine for loading the parameter.
        yield request.execute('dbo.sp_Empleados_Save');
        res.json({ message: 'Empleado actualizado correctamente.' });
    }
    catch (err) {
        // Custom error from SP
        if (err.message && err.message.includes('El código de referencia ya existe')) {
            return res.status(409).json({ message: err.message });
        }
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
const getBirthdays = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { months } = req.query;
        if (!months)
            return res.status(400).json({ message: 'Meses no especificados.' });
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request()
            .input('Months', mssql_1.default.NVarChar, months.toString())
            .execute('sp_Empleados_GetBirthdays');
        res.json(result.recordset);
    }
    catch (err) {
        console.error('Error al obtener cumpleaños:', err);
        res.status(500).json({ message: err.message || 'Error del servidor.' });
    }
});
exports.getBirthdays = getBirthdays;
const getAnniversaries = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const msg = `--- [DEBUG] getAnniversaries CALLED with query: ${JSON.stringify(req.query)}\n`;
    require('fs').appendFileSync(require('path').join(process.env.TEMP || 'C:\\Windows\\Temp', 'api_debug.log'), msg);
    try {
        const { months } = req.query;
        if (!months)
            return res.status(400).json({ message: 'Meses no especificados.' });
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request()
            .input('Months', mssql_1.default.NVarChar, months.toString())
            .execute('sp_Empleados_GetAnniversaries');
        res.json(result.recordset);
    }
    catch (err) {
        // Log error to a file for investigation (using a more accessible path)
        const tempLogPath = require('path').join(process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp', 'error_anniv.log');
        const errorLog = `[${new Date().toISOString()}] Error in getAnniversaries: ${err.message}\nStack: ${err.stack}\nQuery: ${JSON.stringify(req.query)}\n`;
        require('fs').appendFileSync(tempLogPath, errorLog);
        console.error('Error al obtener aniversarios:', err);
        res.status(500).json({ message: err.message || 'Error del servidor.' });
    }
});
exports.getAnniversaries = getAnniversaries;
const getPermittedEmployees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, req.user.usuarioId)
            .execute('dbo.sp_Empleados_GetPermitidos');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: err.message || 'Error al obtener empleados permitidos.' });
    }
});
exports.getPermittedEmployees = getPermittedEmployees;
