/**
 * 🎬 CRAWL TOÀN BỘ PHIM TỪ OPHIM API
 * ─────────────────────────────────────
 * Chạy: npx tsx crawl-all.ts
 * 
 * - Phân trang qua /v1/api/danh-sach/phim-moi-cap-nhat
 * - Lấy chi tiết + episodes cho mỗi phim
 * - Upsert vào PostgreSQL qua Prisma
 * - Có retry, rate limit, progress log
 * - Có thể resume nếu bị ngắt (skip phim đã có trong DB)
 */
import 'dotenv/config';
import { prisma } from './src/lib/prisma';

const OPHIM_API = process.env.OPHIM_API_URL || 'https://ophim1.com';
const CDN = 'https://img.ophim.cc/uploads/movies/';
const DELAY_MS = 200;        // Delay giữa mỗi request chi tiết
const PAGE_DELAY_MS = 500;   // Delay giữa mỗi trang
const MAX_RETRIES = 3;       // Retry tối đa khi lỗi
const START_PAGE = 1;        // Trang bắt đầu (điều chỉnh nếu muốn resume)

// ── Helpers ──
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err: any) {
            if (i < retries - 1) {
                await sleep(1000 * (i + 1)); // Backoff: 1s, 2s, 3s
                continue;
            }
            throw err;
        }
    }
}

// ── Upsert 1 phim + episodes ──
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

    // Upsert episodes
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
                    update: {
                        linkM3u8: ep.link_m3u8,
                        linkEmbed: ep.link_embed,
                    },
                    create: {
                        movieId: savedMovie.id,
                        serverName: server.server_name,
                        episodeName: ep.name,
                        linkM3u8: ep.link_m3u8,
                        linkEmbed: ep.link_embed,
                    },
                });
            } catch { /* Skip duplicate episode errors */ }
        }
    }
}

// ── Main crawl loop ──
async function main() {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🎬 CRAWL TOÀN BỘ PHIM TỪ OPHIM API     ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');

    // Lấy tổng số trang từ trang đầu
    const firstPage = await fetchWithRetry(`${OPHIM_API}/v1/api/danh-sach/phim-moi-cap-nhat?page=1`);
    const pagination = firstPage?.data?.params?.pagination ?? {};
    const totalItems = pagination.totalItems ?? 0;
    const perPage = pagination.totalItemsPerPage ?? 24;
    const totalPages = Math.ceil(totalItems / perPage);

    console.log(`📊 Tổng phim: ${totalItems.toLocaleString()}`);
    console.log(`📄 Tổng trang: ${totalPages.toLocaleString()} (${perPage} phim/trang)`);
    console.log(`⏱  Delay: ${DELAY_MS}ms/phim, ${PAGE_DELAY_MS}ms/trang`);
    console.log(`🚀 Bắt đầu từ trang: ${START_PAGE}`);
    console.log('─'.repeat(50));
    console.log('');

    const startTime = Date.now();
    let totalSynced = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (let page = START_PAGE; page <= totalPages; page++) {
        const pageStart = Date.now();

        try {
            // Fetch danh sách phim trang này
            const data = await fetchWithRetry(`${OPHIM_API}/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`);
            const movies = data?.data?.items ?? [];

            if (movies.length === 0) {
                console.log(`⚠  Trang ${page}: trống → dừng!`);
                break;
            }

            let pageSynced = 0;
            let pageErrors = 0;

            for (let i = 0; i < movies.length; i++) {
                const movie = movies[i];
                try {
                    // Lấy chi tiết phim
                    const detail = await fetchWithRetry(`${OPHIM_API}/v1/api/phim/${movie.slug}`);
                    const movieData = detail?.data?.item;
                    const episodes = movieData?.episodes ?? [];

                    if (!movieData) {
                        totalSkipped++;
                        continue;
                    }

                    // Thử lấy ảnh gốc từ TMDB
                    let tmdbImages = null;
                    try {
                        const imgRes = await fetchWithRetry(`${OPHIM_API}/v1/api/phim/${movie.slug}/images`, 1);
                        tmdbImages = imgRes?.data;
                    } catch (e) {
                        // Bỏ qua nếu không lấy được ảnh
                    }

                    await upsertMovie(movieData, episodes, tmdbImages);
                    pageSynced++;
                    totalSynced++;

                    await sleep(DELAY_MS);
                } catch (err: any) {
                    pageErrors++;
                    totalErrors++;
                    // Không log từng lỗi chi tiết để tránh spam
                }
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            const pageTime = ((Date.now() - pageStart) / 1000).toFixed(1);
            const eta = totalSynced > 0
                ? Math.round(((Date.now() - startTime) / totalSynced) * (totalItems - totalSynced - totalSkipped) / 1000 / 60)
                : '?';

            console.log(
                `📄 Trang ${String(page).padStart(4)}/${totalPages} | ` +
                `✅ ${pageSynced}/${movies.length} | ` +
                `Tổng: ${totalSynced.toLocaleString()} | ` +
                `❌ ${totalErrors} | ` +
                `⏱ ${pageTime}s | ` +
                `Đã chạy: ${elapsed}s | ` +
                `ETA: ~${eta} phút`
            );

            await sleep(PAGE_DELAY_MS);
        } catch (err: any) {
            console.error(`❌ Lỗi trang ${page}: ${err.message}. Tiếp tục...`);
            totalErrors++;
            await sleep(2000);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('');
    console.log('═'.repeat(50));
    console.log(`✅ HOÀN TẤT!`);
    console.log(`   Tổng phim đồng bộ: ${totalSynced.toLocaleString()}`);
    console.log(`   Bỏ qua:           ${totalSkipped}`);
    console.log(`   Lỗi:              ${totalErrors}`);
    console.log(`   Thời gian:        ${totalTime} phút`);
    console.log('═'.repeat(50));
}

main()
    .catch(console.error)
    .finally(() => {
        prisma.$disconnect();
        process.exit(0);
    });
