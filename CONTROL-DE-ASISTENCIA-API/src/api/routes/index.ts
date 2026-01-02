// src/api/routes/index.ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import catalogRoutes from './catalog.routes';
import attendanceRoutes from './attendance.routes';
import employeeRoutes from './employee.routes';
import scheduleRoutes from './schedule.routes';
import reportRoutes from './report.routes'; 
import incidentsRoutes from './incidents.routes'; 
import payrollRoutes from './payroll.routes';
import dashboardRoutes from './dashboard.routes'; 

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/employees', employeeRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/reports', reportRoutes);
router.use('/incidents', incidentsRoutes); 
router.use('/payroll', payrollRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;