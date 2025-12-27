import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig: sql.config = {
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD ,
    server: process.env.DB_SERVER || '',
    port: Number(process.env.DB_PORT)|| 1433 ,
    database: process.env.DB_DATABASE ,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
    }
};

export const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Connected to MSSQL');
        return pool;
    })
    .catch(err => {
console.error('¡Falló la conexión a la base de datos! Configuración incorrecta: ', err);
        throw err;
    });
