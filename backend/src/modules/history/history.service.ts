import { prisma } from '../../lib/prisma';

export async function upsertHistory(userId: string, movieId: string, episodeId: string | null, progressSeconds: number) {
    const existing = await prisma.watchHistory.findFirst({
        where: { userId, movieId },
    });

    if (existing) {
        return prisma.watchHistory.update({
            where: { id: existing.id },
            data: {
                episodeId,
                progressSeconds,
                watchedAt: new Date(),
            },
        });
    }

    return prisma.watchHistory.create({
        data: {
            userId,
            movieId,
            episodeId,
            progressSeconds,
        },
    });
}

export async function getHistory(userId: string) {
    const history = await prisma.watchHistory.findMany({
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
                    quality: true,
                },
            },
            episode: {
                select: {
                    id: true,
                    episodeName: true,
                },
            },
        },
        orderBy: { watchedAt: 'desc' },
    });

    return history;
}
