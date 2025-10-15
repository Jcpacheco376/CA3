import express from 'express';
import cors from 'cors';
import { PORT, LOCAL_IP } from './config';
import apiRouter from './api/routes';

const app = express();

app.use(cors({ origin: `http://${LOCAL_IP}:5173` }));
app.use(express.json());

app.use('/api', apiRouter);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de la API corriendo en http://${LOCAL_IP}:${PORT}`);
});
