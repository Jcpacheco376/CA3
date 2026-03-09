"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// CONTROL-DE-ASISTENCIA-API/src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./api/routes"));
const SyncScheduler_1 = require("./api/services/sync/SyncScheduler"); // <--- IMPORTAR
const app = (0, express_1.default)();
// --- CONFIGURACIÓN DE ORIGEN (CORS) ---
// Generamos la URL propia para auto-autorizarnos
const SELF_ORIGIN = `http://${config_1.LOCAL_IP}:${config_1.PORT}`;
const LOCALHOST_ORIGIN = `http://localhost:${config_1.PORT}`;
const corsOptions = {
    origin: (origin, callback) => {
        // 1. Permitir peticiones sin origen (como las del mismo servidor o Postman)
        if (!origin)
            return callback(null, true);
        // 2. Permitir si está en la lista blanca (.env)
        if (config_1.ALLOWED_ORIGINS.includes(origin))
            return callback(null, true);
        // 3. Permitir si es el mismo servidor (IP o Localhost)
        if (origin === SELF_ORIGIN || origin === LOCALHOST_ORIGIN)
            return callback(null, true);
        // 4. Bloquear resto
        console.error(`🔴 BLOQUEO CORS: ${origin} no permitido.`);
        callback(new Error('No permitido por CORS'));
    }
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// 1. Rutas de API
app.use('/api', routes_1.default);
// =================================================================
// 2. SERVIR FRONTEND (Lógica Inteligente)
// =================================================================
const isPkg = process.pkg;
// Opción 1: Ruta en el Paquete de Instalación (Modo EXE / PKG)
// Si es EXE, baseDir es la carpeta donde está el .exe (app/api-asistencia/)
// El frontend está en app/frontend-asistencia/, por lo tanto es '../frontend-asistencia'
const prodPath = isPkg
    ? path_1.default.join(path_1.default.dirname(process.execPath), '../frontend-asistencia')
    : path_1.default.join(__dirname, '../../frontend-asistencia');
// Opción 2: Ruta en tu Entorno Local (Desarrollo)
const devPath = path_1.default.join(__dirname, '../../CONTROL-DE-ASISTENCIA/dist');
let frontendPath = null;
if (fs_1.default.existsSync(prodPath)) {
    frontendPath = prodPath;
    console.log('📦 MODO CLIENTE: Sirviendo frontend desde carpeta de instalación.');
}
else if (fs_1.default.existsSync(devPath)) {
    frontendPath = devPath;
    console.log('💻 MODO DEV LOCAL: Sirviendo frontend desde carpeta del monorepo.');
}
if (frontendPath) {
    // Servir archivos estáticos (JS, CSS)
    app.use(express_1.default.static(frontendPath));
    // Catch-all: Cualquier ruta que no sea API devuelve el index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            const indexPath = path_1.default.join(frontendPath, 'index.html');
            if (fs_1.default.existsSync(indexPath)) {
                res.sendFile(indexPath);
            }
            else {
                res.status(404).send('Frontend index.html not found');
            }
        }
    });
}
else {
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
(0, SyncScheduler_1.startSyncScheduler)();
app.listen(config_1.PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://${config_1.LOCAL_IP}:${config_1.PORT}`);
    if (frontendPath) {
        console.log(`🌍 Frontend disponible en http://${config_1.LOCAL_IP}:${config_1.PORT}`);
    }
});
