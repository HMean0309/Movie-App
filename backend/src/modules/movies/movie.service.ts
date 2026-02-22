import { prisma } from '../../lib/prisma';
import { getOrSet, invalidateCache } from '../../lib/cache';

// TTL constants (giây)
const TTL = {
  MOVIE_LIST: 60 * 10,      // 10 phút
  MOVIE_DETAIL: 60 * 60,    // 1 giờ
  MOVIE_SEARCH: 60 * 5,     // 5 phút
};

// ── Danh sách phim (có filter + phân trang) ──────────────────
export async function getMovies(params: {
  page?: number;
  limit?: number;
  category?: string;
  country?: string;
  year?: number | number[];
  type?: string;
  sort?: string;
  excludeCountries?: string;
  excludeStatus?: string;
  minImdb?: number;
}) {
  const { page = 1, limit = 24, category, country, year, type, sort = 'newest', excludeCountries, excludeStatus, minImdb } = params;
  const skip = (page - 1) * limit;

  // Cache key gồm tất cả params để tránh nhầm lẫn kết quả
  const cacheKey = `movies:list:${page}:${limit}:${category}:${country}:${year?.toString()}:${type}:${sort}:${excludeCountries}:${excludeStatus}:${minImdb}`;

  return getOrSet(cacheKey, TTL.MOVIE_LIST, async () => {
    // Build filter động theo params có hay không
    const where: any = {};
    if (type) where.type = type;
    if (category) where.categories = { array_contains: category };
    if (country) where.countries = { array_contains: country };
    if (excludeStatus) where.status = { not: excludeStatus };

    if (minImdb) {
      where.OR = [
        { imdbVote: { gte: minImdb } },
        { tmdbVote: { gte: minImdb } }
      ];
    }

    if (year) {
      if (Array.isArray(year)) {
        where.year = { in: year };
      } else {
        where.year = year;
      }
    }

    if (excludeCountries) {
      const excludes = excludeCountries.split(',').map(c => c.trim()).filter(Boolean);
      if (excludes.length > 0) {
        where.NOT = excludes.map(c => ({
          countries: { array_contains: c }
        }));
      }
    }

    let orderBy: any = [
      { year: 'desc' },
      { view: 'desc' },
      { syncedAt: 'desc' }
    ];

    if (sort === 'trending') {
      orderBy = [
        { view: 'desc' },
        { imdbVote: 'desc' },
        { syncedAt: 'desc' }
      ];
    }

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          slug: true,
          name: true,
          originName: true,
          type: true,
          posterUrl: true,
          thumbUrl: true,
          year: true,
          categories: true,
          status: true,
          tmdbVote: true,
          view: true,
          tmdbPoster: true,
          tmdbBackdrop: true,
        },
      }),
      prisma.movie.count({ where }),
    ]);

    return {
      movies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });
}

// ── Chi tiết phim + danh sách tập ────────────────────────────
export async function getMovieBySlug(slug: string) {
  const cacheKey = `movies:detail_v3:${slug}`;

  return getOrSet(cacheKey, TTL.MOVIE_DETAIL, async () => {
    const movie = await prisma.movie.findUnique({
      where: { slug },
      include: {
        episodes: {
          orderBy: { episodeName: 'asc' },
        },
      },
    });

    if (!movie) throw new Error('Không tìm thấy phim');
    return movie;
  });
}

// ── Tìm kiếm phim ────────────────────────────────────────────
export async function searchMovies(keyword: string, page = 1, limit = 24) {
  const cacheKey = `movies:search:${keyword}:${page}`;

  return getOrSet(cacheKey, TTL.MOVIE_SEARCH, async () => {
    const skip = (page - 1) * limit;

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where: {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { originName: { contains: keyword, mode: 'insensitive' } },
          ],
        },
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          name: true,
          originName: true,
          posterUrl: true,
          thumbUrl: true,
          year: true,
        },
      }),
      prisma.movie.count({
        where: {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { originName: { contains: keyword, mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    return { movies, pagination: { page, limit, total } };
  });
}

// ── Đánh giá phim (Review) ──────────────────────────────────
export async function addReview(userId: string, movieId: string, rating: number, comment: string) {
  return prisma.review.upsert({
    where: { userId_movieId: { userId, movieId } },
    update: { rating, comment },
    create: { userId, movieId, rating, comment },
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } }
  });
}

export async function getReviews(movieId: string) {
  return prisma.review.findMany({
    where: { movieId },
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' }
  });
}
