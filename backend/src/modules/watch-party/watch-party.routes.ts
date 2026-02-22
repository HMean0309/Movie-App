import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import * as partyController from './watch-party.controller';

const router = Router();

router.post('/rooms', requireAuth, partyController.createRoomHandler);
router.post('/rooms/join', requireAuth, partyController.joinRoomHandler);
router.get('/rooms/:roomId', requireAuth, partyController.getRoomHandler);

export default router;
