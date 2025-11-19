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
exports.getAllPermissions = exports.upsertRole = exports.getAllRoles = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const getAllRoles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['roles.assign'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_Roles_GetAll');
        res.json(result.recordset.map(role => (Object.assign(Object.assign({}, role), { Permisos: role.Permisos ? JSON.parse(role.Permisos) : [] }))));
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener roles.' });
    }
});
exports.getAllRoles = getAllRoles;
const upsertRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['roles.manage'])
        return res.status(403).json({ message: 'Acceso denegado.' }); // Corregido a 'manage'
    const { RoleId, NombreRol, Descripcion, Permisos } = req.body;
    let pool;
    try {
        pool = yield mssql_1.default.connect(database_1.dbConfig);
        // 1. Guardar el Rol
        const result = yield pool.request()
            .input('RoleId', mssql_1.default.Int, RoleId || 0)
            .input('NombreRol', mssql_1.default.NVarChar, NombreRol)
            .input('Descripcion', mssql_1.default.NVarChar, Descripcion)
            .input('PermisosJSON', mssql_1.default.NVarChar, JSON.stringify(Permisos || []))
            .execute('sp_Roles_Upsert');
        const savedRole = { RoleId: result.recordset[0].RoleId, NombreRol };
        // 2. --- NUEVO: Invalidar sesiones de usuarios afectados ---
        // Si es una actualización (RoleId > 0), incrementamos la versión del token
        if (RoleId > 0) {
            yield pool.request()
                .input('RoleId', mssql_1.default.Int, RoleId)
                .execute('sp_Roles_UpdateTokenVersion');
            //console.log(`Sesiones invalidadas para usuarios del rol ${RoleId}`);
        }
        res.status(200).json({ message: 'Rol guardado correctamente.', role: savedRole });
    }
    catch (err) {
        console.error("Error al guardar rol:", err.message);
        res.status(409).json({ message: err.message });
    }
    finally {
        if (pool)
            pool.close();
    }
});
exports.upsertRole = upsertRole;
const getAllPermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['roles.assign'])
        return res.status(403).json({ message: 'Acceso denegado.' });
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const result = yield pool.request().execute('sp_Permisos_GetAll');
        res.json(result.recordset);
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener permisos.' });
    }
});
exports.getAllPermissions = getAllPermissions;
