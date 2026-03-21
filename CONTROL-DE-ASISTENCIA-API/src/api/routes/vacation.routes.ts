import { Router } from 'express';
import { getBalance, getRequests, createRequest, respondRequest, getHistory, updateAdjustment, recalculate, getDetails, addAdjustmentDetail, deleteAdjustmentDetail } from '../controllers/vacation.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/balance/:empleadoId', getBalance);
router.get('/history/:empleadoId', getHistory);
router.get('/details/:empleadoId/:year', getDetails);
router.get('/requests', getRequests);
router.post('/request', createRequest);
router.post('/approve/:id', respondRequest);
router.post('/recalculate/:empleadoId', recalculate);
router.post('/recalculate', recalculate);                       // Recalculate all
router.put('/balance/adjustment/:saldoId', updateAdjustment);
router.post('/adjustment/detail', addAdjustmentDetail);
router.delete('/adjustment/detail/:id', deleteAdjustmentDetail);

export default router;
