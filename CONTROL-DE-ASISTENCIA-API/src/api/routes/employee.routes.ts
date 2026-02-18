import { Router } from 'express';
import { getEmployeeProfile, getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getEmployees);
router.post('/', authMiddleware, createEmployee);
router.put('/:employeeId', authMiddleware, updateEmployee);
router.delete('/:employeeId', authMiddleware, deleteEmployee);
router.get('/:employeeId', authMiddleware, getEmployeeProfile);
router.get('/:employeeId/profile', authMiddleware, getEmployeeProfile);

export default router;
