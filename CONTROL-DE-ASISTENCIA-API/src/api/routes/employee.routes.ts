import { Router } from 'express';
import { getEmployeeProfile, getEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployeeStats } from '../controllers/employee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Specific routes first to avoid ID collision
router.get('/stats', authMiddleware, getEmployeeStats);
router.get('/', authMiddleware, getEmployees);
router.post('/', authMiddleware, createEmployee);
router.put('/:employeeId', authMiddleware, updateEmployee);
router.delete('/:employeeId', authMiddleware, deleteEmployee);
router.get('/:employeeId', authMiddleware, getEmployeeProfile); // Order matters: specific routes first
router.get('/:employeeId/profile', authMiddleware, getEmployeeProfile);

export default router;
