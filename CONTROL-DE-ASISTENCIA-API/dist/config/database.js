"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolPromise = exports.dbConfig = void 0;
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'sist3m4sSQL',
    server: process.env.DB_SERVER || '192.168.0.223',
    database: process.env.DB_NAME || 'CA',
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};
exports.poolPromise = new mssql_1.default.ConnectionPool(exports.dbConfig)
    .connect()
    .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
})
    .catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    throw err;
});
