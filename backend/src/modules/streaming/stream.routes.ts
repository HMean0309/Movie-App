import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import * as streamController from './stream.controller';

const router = Router();

// Tất cả đều cần đăng nhập
router.post('/start', requireAuth, streamController.startStreamHandler);
router.post('/heartbeat', requireAuth, streamController.heartbeatHandler);
router.post('/stop', requireAuth, streamController.stopStreamHandler);

export default router;
