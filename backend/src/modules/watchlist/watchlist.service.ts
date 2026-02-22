import { prisma } from '../../lib/prisma';

export async function addToWatchlist(userId: string, movieId: string) {
    // Check if movie exists
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
        throw new Error('Phim không tồn tại');
    }

    // Check if already in watchlist
    const existing = await prisma.watchlist.findUnique({
        where: {
            userId_movieId: {
                userId,
                movieId,
            },
        },
    });

    if (existing) {
        return existing; // Already added
    }

    // Add to watchlist
    return prisma.watchlist.create({
        data: {
            userId,
            movieId,
        },
    });
}

export async function removeFromWatchlist(userId: string, movieId: string) {
    try {
        await prisma.watchlist.delete({
            where: {
                userId_movieId: {
                    userId,
                    movieId,
                },
            },
        });
        return true;
    } catch (error) {
        return false; // If doesn't exist, ignore
    }
}

export async function getWatchlist(userId: string) {
    const watchlist = await prisma.watchlist.findMany({
        where: { userId },
        include: {
            movie: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    posterUrl: true,
                    tmdbPoster: true,
                    tmdbBackdrop: true,
                    year: true,
                    episodeCurrent: true,
                    quality: true,
                    lang: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    return watchlist.map((item) => item.movie);
}

export async function checkInWatchlist(userId: string, movieId: string) {
    const existing = await prisma.watchlist.findUnique({
        where: {
            userId_movieId: {
                userId,
                movieId,
            },
        },
    });
    return !!existing;
}
