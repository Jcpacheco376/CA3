// CONTROL-DE-ASISTENCIA-API/src/api/routes/device.routes.ts
import { Router } from 'express';
import { getDevices, getZones, createDevice, updateDevice, updateZone, deleteZone, getLogs, testDeviceConnection, 
    testConnectionManual, diagnoseDevice, captureSnapshot, syncEmployeesFull, createZone, syncDeviceTime, syncFacesOnly,
//    deleteFingerprints, 
deleteAllUsersFromDevice, deleteAllAdminsFromDevice,
//  deleteFaces, deleteAllData
 } from '../controllers/device.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getDevices);
router.get('/zones', authMiddleware, getZones);
router.post('/', authMiddleware, createDevice);
router.post('/test-connection', authMiddleware, testDeviceConnection); 
router.post('/test-manual', authMiddleware, testConnectionManual);
router.post('/zones', authMiddleware, createZone);
router.put('/zones/:id', authMiddleware, updateZone);
router.delete('/zones/:id', authMiddleware, deleteZone);
router.put('/:id', authMiddleware, updateDevice);
router.post('/:id/sync', authMiddleware, getLogs);
router.post('/:id/sync-employees', authMiddleware, syncEmployeesFull);
router.post('/:id/sync-faces', authMiddleware, syncFacesOnly);
router.post('/:id/test-connection', authMiddleware, testDeviceConnection);  
router.post('/:id/sync-time', authMiddleware, syncDeviceTime);
//router.post('/:id/delete-fingerprints', authMiddleware, deleteFingerprints);
router.post('/:id/delete-users', authMiddleware, deleteAllUsersFromDevice);
router.post('/:id/delete-admins', authMiddleware, deleteAllAdminsFromDevice);
//router.post('/:id/delete-faces', authMiddleware, deleteFaces);
//router.post('/:id/delete-data', authMiddleware, deleteAllData);
router.get('/:id/diagnose', authMiddleware, diagnoseDevice);
router.get('/:id/snapshots', authMiddleware, captureSnapshot);
export default router;