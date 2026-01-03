import { Router } from 'express';
import {
    getSchedules,
    getScheduleAssignments,
    saveScheduleAssignments,
    validateScheduleBatch
} from '../controllers/schedule.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getSchedules);
router.post('/assignments', authMiddleware, getScheduleAssignments);
router.post('/assignments/validate', authMiddleware, validateScheduleBatch);
router.put('/assignments', authMiddleware, saveScheduleAssignments);

export default router;
