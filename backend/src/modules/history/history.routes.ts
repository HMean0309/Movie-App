import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import * as historyController from './history.controller';

const router = Router();

// Yêu cầu user login để lưu lịch sử
router.use(requireAuth);

router.post('/', historyController.upsertHandler);
router.get('/', historyController.getHandler);

export default router;
