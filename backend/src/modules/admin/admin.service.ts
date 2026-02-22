import { prisma } from '../../lib/prisma';

export async function getDashboardStats() {
    const [totalMovies, totalUsers, totalViewsData] = await Promise.all([
        prisma.movie.count(),
        prisma.user.count(),
        prisma.movie.aggregate({
            _sum: { view: true },
        }),
    ]);

    return {
        totalMovies,
        totalUsers,
        totalViews: totalViewsData._sum.view || 0,
    };
}
