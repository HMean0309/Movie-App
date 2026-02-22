import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import * as movieService from './movie.service';

function qs(val: unknown): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val[0] as string;
  return undefined;
}

export async function getMoviesHandler(req: Request, res: Response) {
  try {
    const { page, limit, category, country, year, type, sort, excludeCountries, excludeStatus, minImdb } = req.query;

    let parsedYear: number | number[] | undefined;
    const yStr = qs(year);
    if (yStr) {
      if (yStr.includes(',')) {
        parsedYear = yStr.split(',').map(Number).filter(n => !isNaN(n));
      } else {
        parsedYear = Number(yStr);
      }
    }

    const result = await movieService.getMovies({
      page: page ? Number(qs(page)) : 1,
      limit: limit ? Number(qs(limit)) : 24,
      category: qs(category),
      country: qs(country),
      year: parsedYear,
      type: qs(type),
      sort: qs(sort),
      excludeCountries: qs(excludeCountries),
      excludeStatus: qs(excludeStatus),
      minImdb: minImdb ? Number(qs(minImdb)) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getMovieDetailHandler(req: Request, res: Response) {
  try {
    const slug = req.params.slug as string;
    const movie = await movieService.getMovieBySlug(slug);
    res.json({ success: true, data: movie });
  } catch (err: any) {
    const status = err.message === 'Không tìm thấy phim' ? 404 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
}

export async function searchMoviesHandler(req: Request, res: Response) {
  try {
    const { q, page, limit } = req.query;
    if (!q) {
      res.status(400).json({ success: false, message: 'Thiếu từ khóa tìm kiếm' });
      return;
    }
    const result = await movieService.searchMovies(
      qs(q) || '',
      page ? Number(qs(page)) : 1,
      limit ? Number(qs(limit)) : 24
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function proxyImageHandler(req: Request, res: Response) {
  try {
    const url = req.query.url as string;
    if (!url) {
      res.status(400).send('Missing url parameter');
      return;
    }

    const response = await fetch(url, {
      headers: {
        'Referer': 'https://ophim1.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      res.status(response.status).send('Proxy error: ' + response.statusText);
      return;
    }

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));

  } catch (err: any) {
    res.status(500).send('Proxy execution error');
  }
}

// ── Rating & Review ─────────────────────────────────────────

export async function addReviewHandler(req: Request, res: Response) {
  try {
    const movieId = req.params.movieId as string;
    const { rating, comment } = req.body;
    const user = (req as any).user;

    if (!user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating không hợp lệ (1-5)' });
    }

    const review = await movieService.addReview(user.id, movieId, rating, comment);
    res.json({ success: true, data: review });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getReviewsHandler(req: Request, res: Response) {
  try {
    const movieId = req.params.movieId as string;
    const reviews = await movieService.getReviews(movieId);
    res.json({ success: true, data: reviews });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
}
