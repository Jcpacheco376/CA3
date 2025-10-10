import { Router } from 'express';
import {
    getSchedules,
    getScheduleAssignments,
    saveScheduleAssignments,
    upsertSchedule
} from '../controllers/schedule.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getSchedules);
router.get('/assignments', authMiddleware, getScheduleAssignments);
router.post('/assignments', authMiddleware, saveScheduleAssignments);
router.post('/', authMiddleware, upsertSchedule);

export default router;
