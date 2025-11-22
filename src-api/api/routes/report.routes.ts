// src-api/api/routes/report.routes.ts
import { Router } from 'express';
import { getKardexReport } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/kardex', authMiddleware, getKardexReport);

export default router;