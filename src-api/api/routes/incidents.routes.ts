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
router.post('/:id/auth-request', authMiddleware, requestAuth); 
router.post('/:id/auth-cancel', authMiddleware, cancelAuthRequest);
router.get('/:id/managers', authMiddleware,getIncidentManagers);
router.get('/:id/resolution-options', authMiddleware, getResolutionOptions); 
router.post('/:id/vote', authMiddleware, voteAuth);
export default router;