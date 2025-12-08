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
// Opción A: Ruta en el Paquete de Instalación (Cliente)
const prodPath = path_1.default.join(__dirname, '../../frontend-asistencia');
// Opción B: Ruta en tu Entorno Local (Desarrollo)
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
            res.sendFile(path_1.default.join(frontendPath, 'index.html'));
        }
    });
}
else {
    console.log('⚠️ AVISO: No se encontró el frontend. El servidor funciona solo como API.');
    console.log('   (Si estás en desarrollo y usas Vite aparte, ignora esto).');
}
// =================================================================
app.listen(config_1.PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://${config_1.LOCAL_IP}:${config_1.PORT}`);
    if (frontendPath) {
        console.log(`🌍 Frontend disponible en http://${config_1.LOCAL_IP}:${config_1.PORT}`);
    }
});
