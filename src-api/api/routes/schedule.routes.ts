import { Router } from 'express';
import {
    getSchedules,
    getScheduleAssignments,
    saveScheduleAssignments
} from '../controllers/schedule.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getSchedules);
router.post('/assignments', authMiddleware, getScheduleAssignments);
router.put('/assignments', authMiddleware, saveScheduleAssignments);

export default router;
