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
exports.login = void 0;
const mssql_1 = __importDefault(require("mssql"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../../config/database");
const config_1 = require("../../config");
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, password } = req.body;
    // Lógica del "super admin"
    if (username === 'admin' && password === 'admin') {
        try {
            const pool = yield mssql_1.default.connect(database_1.dbConfig);
            const adminCheckResult = yield pool.request()
                .query(`SELECT COUNT(*) as AdminCount FROM Usuarios u JOIN UsuariosRoles ur ON u.UsuarioId = ur.UsuarioId JOIN Roles r ON ur.RoleId = r.RoleId WHERE r.NombreRol = 'Administrador' AND u.EstaActivo = 1`);
            if (adminCheckResult.recordset[0].AdminCount === 0) {
                const permissionsResult = yield pool.request().execute('sp_Permisos_GetAll');
                const permissions = {};
                permissionsResult.recordset.forEach(p => { permissions[p.NombrePermiso] = [true]; }); // <-- Cambiado aquí
                const token = jsonwebtoken_1.default.sign({ usuarioId: 0, nombreUsuario: 'admin' }, config_1.JWT_SECRET, { expiresIn: '1h' });
                return res.json({ token, user: { UsuarioId: 0, NombreUsuario: 'admin', NombreCompleto: 'Super Administrador (Temporal)', Email: '', permissions } });
            }
        }
        catch (err) {
            return res.status(500).json({ message: 'Error de servidor al verificar administradores.' });
        }
    }
    // Lógica de login normal
    try {
        const pool = yield mssql_1.default.connect(database_1.dbConfig);
        const loginResult = yield pool.request()
            .input('Identificador', mssql_1.default.NVarChar, username)
            .input('Password', mssql_1.default.NVarChar, password)
            .execute('sp_Usuario_ValidarLogin');
        if (loginResult.recordset.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }
        const loggedInUser = loginResult.recordset[0];
        // --- MEJORA CLAVE: Obtenemos el perfil completo del usuario logueado ---
        const allUsersResult = yield pool.request().execute('sp_Usuarios_GetAll');
        let fullUserDetails = allUsersResult.recordset.find(u => u.UsuarioId === loggedInUser.UsuarioId);
        if (!fullUserDetails) {
            return res.status(404).json({ message: 'No se encontró el perfil completo del usuario.' });
        }
        // Parsear los campos JSON del perfil completo
        fullUserDetails = Object.assign(Object.assign({}, fullUserDetails), { Roles: fullUserDetails.Roles ? JSON.parse(fullUserDetails.Roles) : [], Departamentos: fullUserDetails.Departamentos ? JSON.parse(fullUserDetails.Departamentos) : [], GruposNomina: fullUserDetails.GruposNomina ? JSON.parse(fullUserDetails.GruposNomina) : [] });
        // Obtenemos los permisos por separado
        const permissionsResult = yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, loggedInUser.UsuarioId)
            .execute('sp_Usuario_ObtenerPermisos');
        const permissions = {};
        permissionsResult.recordset.forEach(record => {
            permissions[record.NombrePermiso] = record.NombrePolitica ? [record.NombrePolitica] : [true];
        });
        // Creamos el token
        const tokenPayload = { usuarioId: loggedInUser.UsuarioId, nombreUsuario: loggedInUser.NombreUsuario };
        const token = jsonwebtoken_1.default.sign(tokenPayload, config_1.JWT_SECRET, { expiresIn: '8h' });
        // Devolvemos el token y el perfil de usuario COMPLETO
        res.json({
            token,
            user: Object.assign(Object.assign({}, fullUserDetails), { DebeCambiarPassword: loggedInUser.DebeCambiarPassword, // Del resultado del login
                permissions // Los permisos que calculamos
             })
        });
    }
    catch (err) {
        console.error('Error en el login:', err);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});
exports.login = login;
