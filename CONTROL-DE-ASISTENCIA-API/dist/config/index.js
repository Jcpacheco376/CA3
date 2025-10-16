"use strict";
// import dotenv from 'dotenv';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_ORIGIN = exports.LOCAL_IP = exports.JWT_SECRET = exports.PORT = void 0;
// dotenv.config();
// /*
// export const PORT = process.env.PORT || 3001;
// export const JWT_SECRET = process.env.JWT_SECRET || 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';
// export const LOCAL_IP = process.env.LOCAL_IP || '1x92.168.0.10';
// */
// export const PORT =  3001;
// export const JWT_SECRET = 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';
// export const LOCAL_IP =  '192.168.0.10';
// export const CORS_ORIGIN = process.env.CORS_ORIGIN;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// CORREGIDO: Convertimos el puerto a número con parseInt()
exports.PORT = parseInt(process.env.API_PORT || '3001', 10);
exports.JWT_SECRET = process.env.JWT_SECRET || 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';
exports.LOCAL_IP = process.env.LOCAL_IP || '192.168.0.10';
exports.CORS_ORIGIN = process.env.FRONTEND_URL;
