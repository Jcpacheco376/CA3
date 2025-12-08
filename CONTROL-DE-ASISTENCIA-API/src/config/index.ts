// src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

// CORREGIDO: Convertimos el puerto a número con parseInt()
export const PORT = parseInt(process.env.API_PORT || '3001', 10);
export const JWT_SECRET = process.env.JWT_SECRET || 'ESTE_ES_MI_JWT_SECRETO_SUPER_SEGURO_IMPOSIBLE_DE_ADIVINAR456285';
export const LOCAL_IP = process.env.LOCAL_IP || 'localhost';
//export const CORS_ORIGIN = process.env.FRONTEND_URL;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];