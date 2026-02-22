import { Router } from 'express';
import * as authController from './auth.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/register', authController.registerHandler);
router.post('/login', authController.loginHandler);

// Protected routes
router.get('/profile', requireAuth, authController.getProfileHandler);
router.put('/profile', requireAuth, authController.updateProfileHandler);

export default router;
