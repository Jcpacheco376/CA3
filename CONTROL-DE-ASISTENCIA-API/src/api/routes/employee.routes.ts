import { Router } from 'express';
import { getEmployeeProfile, getEmployees, createEmployee, updateEmployee, deleteEmployee, getEmployeeStats, getEmployeePhoto, getBirthdays, getAnniversaries, getPermittedEmployees, getEmployeeSchedulePattern, getEmployeeCalendarSchedule } from '../controllers/employee.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Specific routes first to avoid ID collision
router.get('/permitted', authMiddleware, getPermittedEmployees);
router.get('/anniversaries', authMiddleware, getAnniversaries);
router.get('/stats', authMiddleware, getEmployeeStats);
router.get('/birthdays', authMiddleware, getBirthdays);
router.get('/:employeeId/photo', authMiddleware, getEmployeePhoto); // New endpoint for lazy loading image
router.get('/', authMiddleware, getEmployees);
router.post('/', authMiddleware, createEmployee);
router.put('/:employeeId', authMiddleware, updateEmployee);
router.delete('/:employeeId', authMiddleware, deleteEmployee);
router.get('/:employeeId/schedule-pattern', authMiddleware, getEmployeeSchedulePattern);
router.get('/:employeeId/calendar-schedule', authMiddleware, getEmployeeCalendarSchedule);
router.get('/:employeeId/profile', authMiddleware, getEmployeeProfile);

export default router;
