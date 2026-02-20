import { Router } from 'express';
import { getBalance, getRequests, createRequest, respondRequest } from '../controllers/vacation.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

// We rely on controller-level permission checks or basic global checks here
router.get('/balance/:empleadoId', getBalance);
router.get('/requests', getRequests);
router.post('/request', createRequest);
router.post('/approve/:id', respondRequest); // Used for both approve and reject via body.estatus

export default router;
