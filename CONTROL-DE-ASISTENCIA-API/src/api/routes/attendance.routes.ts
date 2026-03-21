import { Router } from 'express';
import {
    saveAttendance,
    //approveWeek,
    // ensureWeek,
    // ensureRange,
    getDataByRange,
    getRawChecadas,
    regenerateAttendance
} from '../controllers/attendance.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/', authMiddleware, saveAttendance);
//router.post('/approve-week', authMiddleware, approveWeek);
// router.post('/ensure-week', authMiddleware, ensureWeek);
// router.post('/ensure-range', authMiddleware, ensureRange);
router.post('/data-by-range', authMiddleware, getDataByRange);
router.post('/raw-checadas', authMiddleware, getRawChecadas);
router.post('/regenerate', authMiddleware, regenerateAttendance);

export default router;
