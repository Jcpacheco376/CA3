// src-api/api/routes/dashboard.routes.ts
import { Router } from 'express';
import {
    getDashboardStats,
    getDashboardTrends,
    getDashboardActions,
    getDashboardPayroll
} from '../controllers/dashboard.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Endpoints para los widgets del dashboard

// GET /api/dashboard/stats
// Permiso: dashboard.stats.read (validado en controlador)
router.get('/stats', authMiddleware, getDashboardStats);

// GET /api/dashboard/trends
// Permiso: dashboard.stats.read (validado en controlador)
router.get('/trends', authMiddleware, getDashboardTrends);

// GET /api/dashboard/actions
// Permiso: incidencias.authorize (validado en controlador)
router.get('/actions', authMiddleware, getDashboardActions);

// GET /api/dashboard/payroll
// Permiso: nomina.read (validado en controlador)
router.get('/payroll', authMiddleware, getDashboardPayroll);

export default router;