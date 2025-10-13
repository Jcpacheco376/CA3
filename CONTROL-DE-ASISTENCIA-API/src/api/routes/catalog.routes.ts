import { Router } from 'express';
import {
    getDepartamentos,
    getGruposNomina,
    getDepartamentosManagement,
    saveDepartamento,
    getGruposNominaManagement,
    saveGrupoNomina,
    getAttendanceStatuses,
    getAttendanceStatusesManagement,
    upsertAttendanceStatus,
    getSchedulesCatalog,
    upsertScheduleCatalog,
    deleteScheduleCatalog
} from '../controllers/catalog.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/departamentos', authMiddleware, getDepartamentos);
router.get('/grupos-nomina', authMiddleware, getGruposNomina);
router.get('/departamentos/management', authMiddleware, getDepartamentosManagement);
router.post('/departamentos', authMiddleware, saveDepartamento);
router.get('/grupos-nomina/management', authMiddleware, getGruposNominaManagement);
router.post('/grupos-nomina', authMiddleware, saveGrupoNomina);
router.get('/attendance-statuses', authMiddleware, getAttendanceStatuses);
router.get('/attendance-statuses/management', authMiddleware, getAttendanceStatusesManagement);
router.post('/attendance-statuses', authMiddleware, upsertAttendanceStatus);
router.get('/schedules', authMiddleware, getSchedulesCatalog);
router.post('/schedules', authMiddleware, upsertScheduleCatalog);
router.delete('/schedules/:horarioId', authMiddleware, deleteScheduleCatalog);

export default router;