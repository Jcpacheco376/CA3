import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
    getAllProcesses,
    getProcessHistory,
    updateProcess,
    executeProcessManual
} from '../controllers/processes.controller';

const router = Router();

// Todas las rutas requieren estar autenticado
router.use(authMiddleware);

// Obtener todos los procesos
router.get('/', getAllProcesses);

// Obtener bitacora de un proceso
router.get('/:procesoId/history', getProcessHistory);

// Editar / pausar un proceso
router.put('/:procesoId', updateProcess);

// Ejecutar manualmente un proceso (le pasamos keyInterna)
router.post('/execute', executeProcessManual);

export default router;
