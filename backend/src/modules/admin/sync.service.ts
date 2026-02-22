import { prisma } from '../../lib/prisma';

const OPHIM_API = process.env.OPHIM_API_URL || 'https://ophim1.com';
const CDN = 'https://img.ophim.cc/uploads/movies/';
const DELAY_MS = 200;

export let syncProgress = {
    status: 'idle' as 'idle' | 'running' | 'stopping' | 'done' | 'error',
    current: 0,
    page: 0,
    movieName: '',
    newAdded: 0,
    skippedOrUpToDate: false,
};

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err: any) {
            if (i < retries - 1) {
                await sleep(1000 * (i + 1));
                continue;
            }
            throw err;
        }
    }
}

async function upsertMovie(movieData: any, episodes: any[], tmdbImages: any = null) {
    const posterUrl = movieData.poster_url?.startsWith('http') ? movieData.poster_url : `${CDN}${movieData.poster_url}`;
    const thumbUrl = movieData.thumb_url?.startsWith('http') ? movieData.thumb_url : `${CDN}${movieData.thumb_url}`;

    const movieFields = {
        name: movieData.name,
        originName: movieData.origin_name,
        posterUrl,
        thumbUrl,
        description: movieData.content,
        status: movieData.status,
        year: movieData.year,
        categories: movieData.category?.map((c: any) => c.name) ?? [],
        countries: movieData.country?.map((c: any) => c.name) ?? [],
        actors: movieData.actor ?? [],
        directors: movieData.director ?? [],
        time: movieData.time || null,
        quality: movieData.quality || null,
        lang: movieData.lang || null,
        episodeCurrent: movieData.episode_current || null,
        episodeTotal: movieData.episode_total || null,
        tmdbVote: movieData.tmdb?.vote_average || null,
        imdbVote: movieData.imdb?.vote_average || null,
        imdbVoteCount: movieData.imdb?.vote_count || 0,
        view: movieData.view || 0,
        tmdbPoster: tmdbImages?.poster?.original || tmdbImages?.poster || null,
        tmdbBackdrop: tmdbImages?.backdrop?.original || tmdbImages?.backdrop || tmdbImages?.backdrops?.[0]?.file_path || null,
        syncedAt: new Date(),
    };

    const savedMovie = await prisma.movie.upsert({
        where: { slug: movieData.slug },
        update: movieFields,
        create: {
            ophimId: movieData._id,
            slug: movieData.slug,
            type: movieData.type === 'single' ? 'single' : 'series',
            ...movieFields,
        },
    });

    for (const server of episodes) {
        for (const ep of server.server_data ?? []) {
            try {
                await prisma.episode.upsert({
                    where: {
                        movieId_serverName_episodeName: {
                            movieId: savedMovie.id,
                            serverName: server.server_name,
                            episodeName: ep.name,
                        },
                    },
                    update: { linkM3u8: ep.link_m3u8, linkEmbed: ep.link_embed },
                    create: {
                        movieId: savedMovie.id,
                        serverName: server.server_name,
                        episodeName: ep.name,
                        linkM3u8: ep.link_m3u8,
                        linkEmbed: ep.link_embed,
                    },
                });
            } catch { }
        }
    }
}

export async function stopSmartSync() {
    if (syncProgress.status === 'running') {
        syncProgress.status = 'stopping';
    }
}

export async function runSmartSync() {
    if (syncProgress.status === 'running') return;

    try {
        syncProgress.status = 'running';
        syncProgress.newAdded = 0;
        syncProgress.current = 0;
        syncProgress.skippedOrUpToDate = false;

        let totalPages = 1;
        let page = 1;
        let shouldStop = false;

        const firstPage = await fetchWithRetry(`${OPHIM_API}/v1/api/danh-sach/phim-moi-cap-nhat?page=1`);
        totalPages = Math.ceil((firstPage?.data?.params?.pagination?.totalItems ?? 0) / 24) || 1;

        while (page <= totalPages && !shouldStop && syncProgress.status === 'running') {
            syncProgress.page = page;
            const data = await fetchWithRetry(`${OPHIM_API}/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`);
            const movies = data?.data?.items ?? [];

            for (const movie of movies) {
                if (syncProgress.status !== 'running') {
                    shouldStop = true;
                    break;
                }

                syncProgress.movieName = movie.name;
                syncProgress.current++;

                const detail = await fetchWithRetry(`${OPHIM_API}/v1/api/phim/${movie.slug}`);
                const movieData = detail?.data?.item;
                const episodes = movieData?.episodes ?? [];

                if (!movieData) continue;

                // Smart Break: Nếu phim đã tồn tại trong csdl và có số lượng tập bằng với số tập hiển thị trên OPhim
                // Nghĩa là phim này hoàn toàn Up-To-Date (đã cập nhật từ trước) -> Từ mốc này trở đi toàn là phim cũ 
                const existing = await prisma.movie.findUnique({ where: { slug: movie.slug } });
                if (existing && existing.episodeCurrent === movieData.episode_current) {
                    console.log(`[Smart Sync] Break early at ${movie.name}, completely up to date.`);
                    shouldStop = true;
                    syncProgress.skippedOrUpToDate = true;
                    break;
                }

                let tmdbImages = null;
                try {
                    const imgRes = await fetchWithRetry(`${OPHIM_API}/v1/api/phim/${movie.slug}/images`, 1);
                    tmdbImages = imgRes?.data;
                } catch (e) { }

                await upsertMovie(movieData, episodes, tmdbImages);
                syncProgress.newAdded++;
                await sleep(DELAY_MS);
            }
            page++;
        }

        if (syncProgress.status === 'running' || syncProgress.status === 'stopping') {
            syncProgress.status = 'done';
        }
    } catch (e) {
        console.error('[Smart Sync] Error:', e);
        syncProgress.status = 'error';
    }
}
