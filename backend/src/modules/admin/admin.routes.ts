import { Router } from 'express';
import { requireAuth, adminOnly } from '../../middlewares/auth.middleware';
import * as adminController from './admin.controller';

const router = Router();

// Bảo vệ tất cả routes admin với quyền ADMIN
router.use(requireAuth, adminOnly);

router.get('/stats', adminController.getDashboardStats);

// Sync Tool
router.post('/sync/start', adminController.startSync);
router.post('/sync/stop', adminController.stopSync);
router.get('/sync/stream', adminController.streamSyncProgress);

export default router;
