// CONTROL-DE-ASISTENCIA-API/src/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PORT, LOCAL_IP, ALLOWED_ORIGINS } from './config';
import apiRouter from './api/routes';
import { jobScheduler } from './api/services/jobs/JobScheduler'; // <--- IMPORTAR ORQUESTADOR DE TAREAS

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

const isPkg = (process as any).pkg;

// Opción 1: Ruta en el Paquete de Instalación (Modo EXE / PKG)
// Si es EXE, baseDir es la carpeta donde está el .exe (app/api-asistencia/)
// El frontend está en app/frontend-asistencia/, por lo tanto es '../frontend-asistencia'
const prodPath = isPkg
    ? path.join(path.dirname(process.execPath), '../frontend-asistencia')
    : path.join(__dirname, '../../frontend-asistencia');

// Opción 2: Ruta en tu Entorno Local (Desarrollo)
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
            const indexPath = path.join(frontendPath!, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.status(404).send('Frontend index.html not found');
            }
        }
    });
} else {
    console.log('⚠️ AVISO: No se encontró el frontend. El servidor funciona solo como API.');
    console.log('   (Si estás en desarrollo y usas Vite aparte, ignora esto).');
}

// Evita que el servidor se caiga si falla la librería zkteco-js
process.on('uncaughtException', (error) => {
    console.error('🔥 CRITICO: Error no capturado (El sistema sigue funcionando):', error);
    // Aquí podrías registrar el error en un archivo de log si quisieras
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ ALERTA: Promesa rechazada no manejada:', reason);
});
// =================================================================
// Iniciar orquestador de procesos en segundo plano
jobScheduler.initialize();


app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://${LOCAL_IP}:${PORT}`);
    if (frontendPath) {
        console.log(`🌍 Frontend disponible en http://${LOCAL_IP}:${PORT}`);
    }
});