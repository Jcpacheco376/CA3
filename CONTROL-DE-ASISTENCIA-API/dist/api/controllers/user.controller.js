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
exports.updateUserPassword = exports.updateUserPreferences = exports.getAllUsers = exports.createUser = exports.getNextUserId = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const getNextUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['usuarios.create']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_Usuarios_GetNextId');
        res.json(result.recordset[0]);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener el siguiente ID de usuario.' });
    }
});
exports.getNextUserId = getNextUserId;
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['usuarios.create'] && !req.user.permissions['usuarios.update']) {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    // Nuevos campos del body
    const { UsuarioId, NombreCompleto, NombreUsuario, Email, Password, EstaActivo, Roles, Departamentos, GruposNomina, Puestos, Establecimientos } = req.body;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, UsuarioId || 0)
            .input('NombreCompleto', mssql_1.default.NVarChar, NombreCompleto)
            .input('NombreUsuario', mssql_1.default.NVarChar, NombreUsuario)
            .input('Email', mssql_1.default.NVarChar, Email)
            .input('Password', mssql_1.default.NVarChar, Password)
            .input('EstaActivo', mssql_1.default.Bit, EstaActivo)
            .input('RolesJSON', mssql_1.default.NVarChar, JSON.stringify(Roles || []))
            .input('DepartamentosJSON', mssql_1.default.NVarChar, JSON.stringify(Departamentos || []))
            .input('GruposNominaJSON', mssql_1.default.NVarChar, JSON.stringify(GruposNomina || []))
            // Nuevos inputs para el SP
            .input('PuestosJSON', mssql_1.default.NVarChar, JSON.stringify(Puestos || []))
            .input('EstablecimientosJSON', mssql_1.default.NVarChar, JSON.stringify(Establecimientos || []))
            .execute('sp_Usuarios_Upsert');
        res.status(200).json({ message: 'Usuario guardado correctamente.', user: result.recordset[0] });
    }
    catch (err) {
        console.error('Error al guardar el usuario:', err.message);
        res.status(409).json({ message: err.message });
    }
});
exports.createUser = createUser;
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['usuarios.read'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_Usuarios_GetAll');
        const users = (result.recordset || []).map(user => (Object.assign(Object.assign({}, user), { Roles: user.Roles ? JSON.parse(user.Roles) : [], Departamentos: user.Departamentos ? JSON.parse(user.Departamentos) : [], GruposNomina: user.GruposNomina ? JSON.parse(user.GruposNomina) : [], 
            // Nuevos campos para parsear
            Puestos: user.Puestos ? JSON.parse(user.Puestos) : [], Establecimientos: user.Establecimientos ? JSON.parse(user.Establecimientos) : [] })));
        res.json(users); // Siempre responde con un arreglo, aunque esté vacío
    }
    catch (err) {
        console.error('Error en /api/users:', err);
        res.status(500).json({
            message: 'Error al obtener usuarios.',
            error: (err && typeof err === 'object' && 'message' in err) ? err.message : String(err)
        });
    }
});
exports.getAllUsers = getAllUsers;
const updateUserPreferences = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { theme, animationsEnabled } = req.body;
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request().input('UsuarioId', mssql_1.default.Int, userId).input('Theme', mssql_1.default.NVarChar, theme)
            .input('AnimationsEnabled', mssql_1.default.Bit, animationsEnabled).execute('sp_Usuario_ActualizarPreferencias');
        res.status(200).json({ message: 'Preferencias actualizadas.' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error al guardar las preferencias.' });
    }
});
exports.updateUserPreferences = updateUserPreferences;
const updateUserPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { password } = req.body;
    if (!password || password.length < 6)
        return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, userId)
            .input('NuevoPassword', mssql_1.default.NVarChar, password)
            .execute('sp_Usuario_ActualizarPassword');
        res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error al actualizar la contraseña.' });
    }
});
exports.updateUserPassword = updateUserPassword;
