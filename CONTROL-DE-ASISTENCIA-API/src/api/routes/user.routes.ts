import { Router } from 'express';
import {
    getNextUserId,
    createUser,
    getAllUsers,
    updateUserPreferences,
    updateUserPassword,
    resetPassword,
    getPermissionsByUserId
} from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/next-id', authMiddleware, getNextUserId);
router.post('/', authMiddleware, createUser);
router.get('/', authMiddleware, getAllUsers);
router.put('/:userId/preferences', authMiddleware, updateUserPreferences);
router.put('/:userId/password', authMiddleware, updateUserPassword);
router.put('/:userId/reset-password', authMiddleware, resetPassword);
router.get('/permissions', authMiddleware, getPermissionsByUserId); 
export default router;
