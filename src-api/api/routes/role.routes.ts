import { Router } from 'express';
import {
    getAllRoles,
    upsertRole,
    getAllPermissions
} from '../controllers/role.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authMiddleware, getAllRoles);
router.post('/', authMiddleware, upsertRole);
router.get('/permissions', authMiddleware, getAllPermissions);


export default router;
