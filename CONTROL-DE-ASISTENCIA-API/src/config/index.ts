// import dotenv from 'dotenv';


// dotenv.config();
// /*
// export const PORT = process.env.PORT || 3001;
// export const JWT_SECRET = process.env.JWT_SECRET || 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';
// export const LOCAL_IP = process.env.LOCAL_IP || '1x92.168.0.10';
// */
// export const PORT =  3001;
// export const JWT_SECRET = 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';
// export const LOCAL_IP =  '192.168.0.10';


// export const CORS_ORIGIN = process.env.CORS_ORIGIN;

import dotenv from 'dotenv';

dotenv.config();

// CORREGIDO: Convertimos el puerto a número con parseInt()
export const PORT = parseInt(process.env.API_PORT || '3001', 10);
export const JWT_SECRET = process.env.JWT_SECRET || 'TU_SECRETO_JWT_SUPER_SEGURO_CAMBIAME';
export const LOCAL_IP = process.env.LOCAL_IP || '192.168.0.10';
export const CORS_ORIGIN = process.env.FRONTEND_URL;