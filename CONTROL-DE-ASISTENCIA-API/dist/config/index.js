"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LOCAL_IP = exports.JWT_SECRET = exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/*
export const PORT = process.env.PORT || 3001;
export const JWT_SECRET = process.env.JWT_SECRET || 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';
export const LOCAL_IP = process.env.LOCAL_IP || '192.168.0.10';
*/
exports.PORT = 3001;
exports.JWT_SECRET = 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';
exports.LOCAL_IP = '192.168.0.10';
