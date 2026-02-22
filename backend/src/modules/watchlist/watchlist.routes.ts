import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import * as watchlistController from './watchlist.controller';

const router = Router();

// Tất cả đều cần đăng nhập
router.use(requireAuth);

router.post('/', watchlistController.addHandler);
router.delete('/:movieId', watchlistController.removeHandler);
router.get('/', watchlistController.getHandler);
router.get('/check/:movieId', watchlistController.checkHandler);

export default router;
