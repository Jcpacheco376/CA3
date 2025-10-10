import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import catalogRoutes from './catalog.routes';
import attendanceRoutes from './attendance.routes';
import employeeRoutes from './employee.routes';
import scheduleRoutes from './schedule.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/catalogs', catalogRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/employees', employeeRoutes);
router.use('/schedules', scheduleRoutes);

export default router;
