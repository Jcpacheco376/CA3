//src/index.ts
import express from 'express';
import cors from 'cors';
import { PORT, LOCAL_IP, ALLOWED_ORIGINS } from './config';
import apiRouter from './api/routes';

const app = express();




// const allowedOrigins = [
//     CORS_ORIGIN,                 // La URL principal desde tu archivo .env
//     'http://localhost:5173'      // Mantenemos localhost para desarrollo local
// ];

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        
        // --- INICIO DE DEPURACIÓN ---
        // console.log('=================================');
        // console.log('PETICIÓN DE CORS RECIBIDA:');
        // console.log('Origen de la petición (origin):', origin);
        // console.log('Orígenes Permitidos (ALLOWED_ORIGINS):', ALLOWED_ORIGINS);
        // --- FIN DE DEPURACIÓN ---

        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            // console.log('Resultado: PERMITIDO');
            // console.log('=================================');
            callback(null, true);
        } else {
            // console.log('Resultado: RECHAZADO');
            // console.log('=================================');
            callback(new Error('No permitido por CORS'));
        }
    }
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', apiRouter);

// Escucha en '0.0.0.0' para ser accesible desde la red local y para Render
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de la API corriendo en http://${LOCAL_IP}:${PORT}`);
});

