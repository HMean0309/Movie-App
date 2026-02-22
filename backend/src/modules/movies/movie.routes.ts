import { Router } from 'express';
import { syncMoviesQueue } from '../../jobs/queues';
import { requireAuth, adminOnly } from '../../middlewares/auth.middleware';
import * as movieController from './movie.controller';

const router = Router();

router.post('/admin/sync', requireAuth, adminOnly, async (req, res) => {
  const { pages = 5 } = req.body;
  const jobs = Array.from({ length: pages }, (_, i) => ({
    name: `sync-page-${i + 1}`,
    data: { page: i + 1 },
  }));
  await syncMoviesQueue.addBulk(jobs);
  res.json({ success: true, message: `Đã thêm ${pages} job vào queue` });
});

router.get('/search', movieController.searchMoviesHandler);
router.get('/image-proxy', movieController.proxyImageHandler);
router.get('/', movieController.getMoviesHandler);

// Reviews API
router.get('/:movieId/reviews', movieController.getReviewsHandler);
router.post('/:movieId/reviews', requireAuth, movieController.addReviewHandler);

router.get('/:slug', movieController.getMovieDetailHandler);

export default router;
