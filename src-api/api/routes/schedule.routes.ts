import { Router } from 'express';
import {
    getSchedules,
    getScheduleAssignments,
    saveScheduleAssignments
} from '../controllers/schedule.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getSchedules);
router.get('/assignments', authMiddleware, getScheduleAssignments);
router.post('/assignments', authMiddleware, saveScheduleAssignments);

export default router;
