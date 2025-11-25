import { Router } from 'express';
import { getEmployeeProfile } from '../controllers/employee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:employeeId/profile', authMiddleware, getEmployeeProfile);

export default router;
