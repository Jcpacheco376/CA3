// src-api/api/routes/incidents.routes.ts
import { Router } from 'express';
import { analyzeIncidents, getIncidents, updateIncidentStatus } from '../controllers/incidents.controller'; 
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/analyze', authMiddleware, analyzeIncidents);
router.get('/', authMiddleware, getIncidents);
router.put('/:id/status', authMiddleware, updateIncidentStatus); 

export default router;