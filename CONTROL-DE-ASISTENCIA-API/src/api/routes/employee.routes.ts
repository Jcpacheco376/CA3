import { Router } from 'express';
import { getEmployeeProfile, getEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployeeStats, getEmployeePhoto } from '../controllers/employee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Specific routes first to avoid ID collision
router.get('/stats', authMiddleware, getEmployeeStats);
router.get('/:employeeId/photo', authMiddleware, getEmployeePhoto); // New endpoint for lazy loading image
router.get('/', authMiddleware, getEmployees);
router.post('/', authMiddleware, createEmployee);
router.put('/:employeeId', authMiddleware, updateEmployee);
router.delete('/:employeeId', authMiddleware, deleteEmployee);
router.get('/:employeeId', authMiddleware, getEmployeeProfile); // Order matters: specific routes first
router.get('/:employeeId/profile', authMiddleware, getEmployeeProfile);

export default router;
