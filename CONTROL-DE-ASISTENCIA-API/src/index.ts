// CONTROL-DE-ASISTENCIA-API/src/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PORT, LOCAL_IP, ALLOWED_ORIGINS } from './config';
import apiRouter from './api/routes';

const app = express();

// --- CONFIGURACIÓN DE ORIGEN (CORS) ---
// Generamos la URL propia para auto-autorizarnos
const SELF_ORIGIN = `http://${LOCAL_IP}:${PORT}`;
const LOCALHOST_ORIGIN = `http://localhost:${PORT}`;

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // 1. Permitir peticiones sin origen (como las del mismo servidor o Postman)
        if (!origin) return callback(null, true);

        // 2. Permitir si está en la lista blanca (.env)
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);

        // 3. Permitir si es el mismo servidor (IP o Localhost)
        if (origin === SELF_ORIGIN || origin === LOCALHOST_ORIGIN) return callback(null, true);

        // 4. Bloquear resto
        console.error(`🔴 BLOQUEO CORS: ${origin} no permitido.`);
        callback(new Error('No permitido por CORS'));
    }
};

app.use(cors(corsOptions));
app.use(express.json());

// 1. Rutas de API
app.use('/api', apiRouter);

// =================================================================
// 2. SERVIR FRONTEND (Lógica Inteligente)
// =================================================================

// Opción A: Ruta en el Paquete de Instalación (Cliente)
const prodPath = path.join(__dirname, '../../frontend-asistencia');

// Opción B: Ruta en tu Entorno Local (Desarrollo)
const devPath = path.join(__dirname, '../../CONTROL-DE-ASISTENCIA/dist');

let frontendPath = null;

if (fs.existsSync(prodPath)) {
    frontendPath = prodPath;
    console.log('📦 MODO CLIENTE: Sirviendo frontend desde carpeta de instalación.');
} else if (fs.existsSync(devPath)) {
    frontendPath = devPath;
    console.log('💻 MODO DEV LOCAL: Sirviendo frontend desde carpeta del monorepo.');
}

if (frontendPath) {
    // Servir archivos estáticos (JS, CSS)
    app.use(express.static(frontendPath));

    // Catch-all: Cualquier ruta que no sea API devuelve el index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(frontendPath, 'index.html'));
        }
    });
} else {
    console.log('⚠️ AVISO: No se encontró el frontend. El servidor funciona solo como API.');
    console.log('   (Si estás en desarrollo y usas Vite aparte, ignora esto).');
}
// =================================================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://${LOCAL_IP}:${PORT}`);
    if (frontendPath) {
        console.log(`🌍 Frontend disponible en http://${LOCAL_IP}:${PORT}`);
    }
});