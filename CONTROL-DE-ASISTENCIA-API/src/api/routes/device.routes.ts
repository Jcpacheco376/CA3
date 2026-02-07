// CONTROL-DE-ASISTENCIA-API/src/api/routes/device.routes.ts
import { Router } from 'express';
import { getDevices, getZones, createDevice, updateDevice, getLogs, testDeviceConnection, 
    testConnectionManual, diagnoseDevice, captureSnapshot, syncEmployeesFull, createZone} from '../controllers/device.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getDevices);
router.get('/zones', authMiddleware, getZones);
router.post('/', authMiddleware, createDevice);
router.post('/test-connection', authMiddleware, testDeviceConnection); 
router.post('/test-manual', authMiddleware, testConnectionManual);
router.post('/zones', authMiddleware, createZone);
router.put('/:id', authMiddleware, updateDevice);
router.post('/:id/sync', authMiddleware, getLogs);
router.post('/:id/sync-employees', authMiddleware, syncEmployeesFull);
router.post('/:id/test-connection', authMiddleware, testDeviceConnection);
router.get('/:id/diagnose', authMiddleware, diagnoseDevice);
router.get('/:id/snapshots', authMiddleware, captureSnapshot);
export default router;