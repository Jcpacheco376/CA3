// src-api/api/routes/report.routes.ts
import { Router } from 'express';
import { 
    getKardexReport, 
    getAttendanceListReport, 
    validatePayrollPeriod 
} from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/kardex', authMiddleware, getKardexReport);
router.post('/attendance-list', authMiddleware, getAttendanceListReport); 
router.post('/validate-period', authMiddleware, validatePayrollPeriod);

export default router;