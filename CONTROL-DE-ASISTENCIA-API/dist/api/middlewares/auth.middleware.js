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
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    else if (req.query.token) {
        token = req.query.token;
    }
    if (!token) {
        return res.status(401).json({ message: 'Acceso no autorizado: Token no proporcionado.' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET);
        // Si es el super admin temporal, asigna todos los permisos
        if (decoded.usuarioId === 0) {
            const pool = yield database_1.poolPromise;
            const permissionsResult = yield pool.request().execute('sp_Permisos_GetAll');
            const permissions = {};
            permissionsResult.recordset.forEach(p => { permissions[p.NombrePermiso] = [true]; });
            req.user = { usuarioId: 0, permissions };
            return next();
        }
        const pool = yield database_1.poolPromise;
        const userVersionResult = yield pool.request()
            .input('UsuarioId', mssql_1.default.Int, decoded.usuarioId)
            .query('SELECT TokenVersion FROM dbo.Usuarios WHERE UsuarioId = @UsuarioId');
        if (userVersionResult.recordset.length === 0) {
            return res.status(401).json({ message: 'Usuario no encontrado.' });
        }
        const currentDbVersion = userVersionResult.recordset[0].TokenVersion || 1;
        const tokenVersion = decoded.tokenVersion || 1; // Compatibilidad hacia atrás
        // Si la versión del token es menor que la de la BD, el token es inválido (obsoleto)
        if (tokenVersion < currentDbVersion) {
            return res.status(401).json({ message: 'Sesión expirada. Los permisos han cambiado. Por favor inicie sesión nuevamente.', code: 'TOKEN_EXPIRED' });
        }
        const [permissionsResult, dimensionsResult, activeFiltersResult] = yield Promise.all([
            pool.request()
                .input('UsuarioId', mssql_1.default.Int, decoded.usuarioId)
                .execute('sp_Usuario_ObtenerPermisos'),
            pool.request()
                .input('UsuarioId', mssql_1.default.Int, decoded.usuarioId)
                .query(`
                    SELECT 
                        (SELECT DepartamentoId FROM UsuariosDepartamentos WHERE UsuarioId = @UsuarioId FOR JSON PATH) as Departamentos,
                        (SELECT GrupoNominaId FROM UsuariosGruposNomina WHERE UsuarioId = @UsuarioId FOR JSON PATH) as GruposNomina,
                        (SELECT PuestoId FROM UsuariosPuestos WHERE UsuarioId = @UsuarioId FOR JSON PATH) as Puestos,
                        (SELECT EstablecimientoId FROM UsuariosEstablecimientos WHERE UsuarioId = @UsuarioId FOR JSON PATH) as Establecimientos
                `),
            pool.request().query(`
                SELECT ConfigKey, ConfigValue FROM SISConfiguracion 
                WHERE ConfigKey IN ('FiltroDepartamentosActivo', 'FiltroGruposNominaActivo', 'FiltroPuestosActivo', 'FiltroEstablecimientosActivo')
            `)
        ]);
        const permissions = {};
        permissionsResult.recordset.forEach((row) => {
            permissions[row.NombrePermiso] = true;
        });
        const activeFilters = {
            departamentos: activeFiltersResult.recordset.some(r => r.ConfigKey === 'FiltroDepartamentosActivo' && (r.ConfigValue === '1' || r.ConfigValue === 'true')),
            gruposNomina: activeFiltersResult.recordset.some(r => r.ConfigKey === 'FiltroGruposNominaActivo' && (r.ConfigValue === '1' || r.ConfigValue === 'true')),
            puestos: activeFiltersResult.recordset.some(r => r.ConfigKey === 'FiltroPuestosActivo' && (r.ConfigValue === '1' || r.ConfigValue === 'true')),
            establecimientos: activeFiltersResult.recordset.some(r => r.ConfigKey === 'FiltroEstablecimientosActivo' && (r.ConfigValue === '1' || r.ConfigValue === 'true'))
        };
        const dims = dimensionsResult.recordset[0];
        req.user = {
            usuarioId: decoded.usuarioId,
            UsuarioId: decoded.usuarioId,
            permissions,
            activeFilters,
            Departamentos: dims.Departamentos ? JSON.parse(dims.Departamentos) : [],
            GruposNomina: dims.GruposNomina ? JSON.parse(dims.GruposNomina) : [],
            Puestos: dims.Puestos ? JSON.parse(dims.Puestos) : [],
            Establecimientos: dims.Establecimientos ? JSON.parse(dims.Establecimientos) : []
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
});
exports.authMiddleware = authMiddleware;
