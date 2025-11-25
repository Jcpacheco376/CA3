import { Router } from 'express';
import { 
    analyzeIncidents, 
    getIncidents, 
    updateIncidentStatus, 
    getIncidentDetails, 
    assignIncident, 
    resolveIncident,
    requestAuth,
    getIncidentManagers,   
    getResolutionOptions,
    cancelAuthRequest,
    voteAuth   
} from '../controllers/incidents.controller'; 
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Flujo Principal
router.post('/analyze', authMiddleware, analyzeIncidents);
router.get('/', authMiddleware, getIncidents);

// Detalle y Acciones
router.get('/:id/details', authMiddleware, getIncidentDetails);
router.post('/:id/assign', authMiddleware, assignIncident);
router.post('/:id/resolve', authMiddleware, resolveIncident);
router.post('/:id/auth-request', authMiddleware, requestAuth); // Apelación
router.post('/:id/auth-cancel', authMiddleware, cancelAuthRequest);
// --- NUEVOS ENDPOINTS DE SOPORTE (Dropdowns Inteligentes) ---
router.get('/managers', authMiddleware, getIncidentManagers); // Lista filtrada de usuarios
router.get('/:id/resolution-options', authMiddleware, getResolutionOptions); // Estatus válidos para esa incidencia
router.post('/:id/vote', authMiddleware, voteAuth);
export default router;