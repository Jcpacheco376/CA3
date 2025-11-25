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
    deleteScheduleCatalog,
    getPuestos,
    getPuestosManagement,
    savePuesto,
    getEstablecimientos,
    getEstablecimientosManagement,
    saveEstablecimiento
} from '../controllers/catalog.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Departamentos
router.get('/departamentos', authMiddleware, getDepartamentos);
router.get('/departamentos/management', authMiddleware, getDepartamentosManagement);
router.post('/departamentos', authMiddleware, saveDepartamento);

// Grupos Nomina
router.get('/grupos-nomina', authMiddleware, getGruposNomina);
router.get('/grupos-nomina/management', authMiddleware, getGruposNominaManagement);
router.post('/grupos-nomina', authMiddleware, saveGrupoNomina);

// Estatus Asistencia
router.get('/attendance-statuses', authMiddleware, getAttendanceStatuses);
router.get('/attendance-statuses/management', authMiddleware, getAttendanceStatusesManagement);
router.post('/attendance-statuses', authMiddleware, upsertAttendanceStatus);

// Horarios
router.get('/schedules', authMiddleware, getSchedulesCatalog);
router.post('/schedules', authMiddleware, upsertScheduleCatalog);
router.delete('/schedules/:horarioId', authMiddleware, deleteScheduleCatalog);

// Puestos ---
router.get('/puestos', authMiddleware, getPuestos);
router.get('/puestos/management', authMiddleware, getPuestosManagement);
router.post('/puestos', authMiddleware, savePuesto);

// Establecimientos ---
router.get('/establecimientos', authMiddleware, getEstablecimientos);
router.get('/establecimientos/management', authMiddleware, getEstablecimientosManagement);
router.post('/establecimientos', authMiddleware, saveEstablecimiento);

export default router;