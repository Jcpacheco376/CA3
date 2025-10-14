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
app.use((0, cors_1.default)({ origin: `http://${config_1.LOCAL_IP}:5173` }));
app.use(express_1.default.json());
app.use('/api', routes_1.default);
app.listen(config_1.PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de la API corriendo en http://${config_1.LOCAL_IP}:${config_1.PORT}`);
});
