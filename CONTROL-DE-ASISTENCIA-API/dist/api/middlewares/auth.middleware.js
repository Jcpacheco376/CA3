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
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const config_1 = require("../../config");
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Acceso no autorizado: Token no proporcionado.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
        // Si es el super admin temporal, asigna todos los permisos
        if (decoded.usuarioId === 0) {
            const pool = yield mssql_1.default.connect(database_1.dbConfig);
            const permissionsResult = yield pool.request().execute('sp_Permisos_GetAll');
            const permissions = {};
            permissionsResult.recordset.forEach(p => { permissions[p.NombrePermiso] = [true]; });
            req.user = { usuarioId: 0, permissions };
            return next();
        }
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const permissionsResult = yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, decoded.usuarioId)
            .execute('sp_Usuario_ObtenerPermisos');
        const permissions = {};
        permissionsResult.recordset.forEach(p => {
            permissions[p.NombrePermiso] = p.NombrePolitica ? [p.NombrePolitica] : [];
        });
        req.user = { usuarioId: decoded.usuarioId, permissions };
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Token inválido.' });
    }
});
exports.authMiddleware = authMiddleware;
