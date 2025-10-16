// import express from 'express';
// import cors from 'cors';
// import { PORT, LOCAL_IP } from './config';

// import apiRouter from './api/routes';

// const app = express();

// app.use(cors({ origin: `http://${LOCAL_IP}:5173` }));
// app.use(express.json());

// app.use('/api', apiRouter);

// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`🚀 Servidor de la API corriendo en http://${LOCAL_IP}:${PORT}`);
// });


import express from 'express';
import cors from 'cors';
// CORREGIDO: Importa CORS_ORIGIN
import { PORT, LOCAL_IP, CORS_ORIGIN } from './config';
import apiRouter from './api/routes';

const app = express();

// CORREGIDO: Usa la variable CORS_ORIGIN
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

app.use('/api', apiRouter);

// Escucha en '0.0.0.0' para ser accesible desde la red local y para Render
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de la API corriendo en http://${LOCAL_IP}:${PORT}`);
});

