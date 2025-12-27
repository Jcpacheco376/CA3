import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { previewPeriodClose, executePeriodClose, unlockPeriod } from '../controllers/payroll.controller';

const router = Router();

router.post('/preview', authMiddleware,previewPeriodClose);
router.post('/close', authMiddleware,executePeriodClose);
router.post('/unlock', authMiddleware,unlockPeriod);

export default router;