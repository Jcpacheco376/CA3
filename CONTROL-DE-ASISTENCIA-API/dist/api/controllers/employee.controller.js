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
exports.getEmployeeProfile = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = require("../../config/database");
const getEmployeeProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user.permissions['usuarios.read'] && !req.user.permissions['reportesAsistencia.read.own'] && !req.user.permissions['horarios.read']) {
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
