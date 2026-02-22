import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import * as subController from './subscription.controller';

const router = Router();

router.get('/plans', subController.getAllPlansHandler);                     // Public
router.get('/me', requireAuth, subController.getMySubscriptionHandler); // Cần login
router.post('/upgrade', requireAuth, subController.upgradeHandler);     // Cần login

export default router;
