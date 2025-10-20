"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_ORIGINS = exports.LOCAL_IP = exports.JWT_SECRET = exports.PORT = void 0;
// src/config/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// CORREGIDO: Convertimos el puerto a número con parseInt()
exports.PORT = parseInt(process.env.API_PORT || '3001', 10);
exports.JWT_SECRET = process.env.JWT_SECRET || 'ESTE_ES_MI_JWT_SECRETO_SUPER_SEGURO_IMPOSIBLE_DE_ADIVINAR456285';
exports.LOCAL_IP = process.env.LOCAL_IP || '192.168.0.10';
//export const CORS_ORIGIN = process.env.FRONTEND_URL;
exports.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
