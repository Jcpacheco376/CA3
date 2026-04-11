// src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

// CORREGIDO: Soporte para variable PORT de Render o API_PORT local
export const PORT = parseInt(process.env.PORT || process.env.API_PORT || '3001', 10);
export const JWT_SECRET = process.env.JWT_SECRET || 'ESTE_ES_MI_JWT_SECRETO_SUPER_SEGURO_IMPOSIBLE_DE_ADIVINAR456285';
export const LOCAL_IP = process.env.LOCAL_IP || 'localhost';
//export const CORS_ORIGIN = process.env.FRONTEND_URL;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
export const APP_EDITION = process.env.APP_EDITION || 'FULL';