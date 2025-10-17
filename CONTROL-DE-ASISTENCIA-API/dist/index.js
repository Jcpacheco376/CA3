"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./api/routes"));
const app = (0, express_1.default)();
const allowedOrigins = [
    config_1.CORS_ORIGIN, // La URL principal desde tu archivo .env
    'http://localhost:5173' // Mantenemos localhost para desarrollo local
];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('No permitido por CORS'));
        }
    }
};
app.use((0, cors_1.default)(corsOptions));
//app.use(cors({ origin: CORS_ORIGIN }));
app.use(express_1.default.json());
app.use('/api', routes_1.default);
// Escucha en '0.0.0.0' para ser accesible desde la red local y para Render
app.listen(config_1.PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de la API corriendo en http://${config_1.LOCAL_IP}:${config_1.PORT}`);
});
