/**
 * CRAWL TOAN BO PHIM TU OPHIM API
 * Chay: node -e "const env = require('dotenv').config().parsed; require('child_process').execSync('npx tsx crawl-all.ts', {stdio: 'inherit', env: { ...process.env, DATABASE_URL: env.DIRECT_URL }})"
 *
 * Toi uu:
 * - Movie: raw SQL ON CONFLICT (1 round-trip)
 * - Episodes: deleteMany + bulk INSERT (2 round-trips thay vi N*2)
 * - 8 phim song song (Promise.allSettled)
 * - Co the resume bang cach sua START_PAGE
 */
import 'dotenv/config';
import { prisma } from './src/lib/prisma';

const OPHIM_API = process.env.OPHIM_API_URL || 'https://ophim1.com';
const CDN = 'https://img.ophim.cc/uploads/movies/';
const DELAY_MS = 50;         // Delay giua moi batch
const PAGE_DELAY_MS = 100;   // Delay giua moi trang
const MAX_RETRIES = 2;       // Retry toi da khi loi
const START_PAGE = 236;      // Resume tu trang nay (da crawl xong 1-235)
const CONCURRENCY = 8;       // So phim xu ly song song

// ── Helpers ──
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
    for (let i = 0; i < retries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            clearTimeout(timeoutId);
            return data;
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') err.message = 'Fetch Timeout';
            if (i < retries - 1) {
                await sleep(1000 * (i + 1));
                continue;
            }
            throw err;
        }
    }
}

// ── Upsert 1 phim + episodes (optimized) ──
async function upsertMovie(movieData: any, episodes: any[]) {
    const posterUrl = movieData.poster_url?.startsWith('http')
        ? movieData.poster_url
        : `${CDN}${movieData.poster_url}`;
    const thumbUrl = movieData.thumb_url?.startsWith('http')
        ? movieData.thumb_url
        : `${CDN}${movieData.thumb_url}`;

    const movieType = movieData.type === 'single' ? 'single' : 'series';

    // 1 round-trip: raw SQL UPSERT thay vi findUnique + create/update (2 round-trips)
    await prisma.$executeRawUnsafe(`
        INSERT INTO movies (
            id, ophim_id, slug, name, origin_name, type,
            poster_url, thumb_url, description, status, year,
            categories, countries, actors, directors,
            time, quality, lang, episode_current, episode_total,
            tmdb_vote, imdb_vote, imdb_vote_count, view,
            synced_at, created_at
        ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5::"MovieType",
            $6, $7, $8, $9, $10,
            $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb,
            $15, $16, $17, $18, $19,
            $20, $21, $22, $23,
            now(), now()
        )
        ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            origin_name = EXCLUDED.origin_name,
            poster_url = EXCLUDED.poster_url,
            thumb_url = EXCLUDED.thumb_url,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            year = EXCLUDED.year,
            categories = EXCLUDED.categories,
            countries = EXCLUDED.countries,
            actors = EXCLUDED.actors,
            directors = EXCLUDED.directors,
            time = EXCLUDED.time,
            quality = EXCLUDED.quality,
            lang = EXCLUDED.lang,
            episode_current = EXCLUDED.episode_current,
            episode_total = EXCLUDED.episode_total,
            tmdb_vote = EXCLUDED.tmdb_vote,
            imdb_vote = EXCLUDED.imdb_vote,
            imdb_vote_count = EXCLUDED.imdb_vote_count,
            view = EXCLUDED.view,
            synced_at = now()
    `,
        String(movieData._id),
        movieData.slug,
        movieData.name,
        movieData.origin_name || null,
        movieType,
        posterUrl,
        thumbUrl,
        movieData.content || null,
        movieData.status || null,
        movieData.year || null,
        JSON.stringify(movieData.category?.map((c: any) => c.name) ?? []),
        JSON.stringify(movieData.country?.map((c: any) => c.name) ?? []),
        JSON.stringify(movieData.actor ?? []),
        JSON.stringify(movieData.director ?? []),
        movieData.time || null,
        movieData.quality || null,
        movieData.lang || null,
        movieData.episode_current || null,
        movieData.episode_total || null,
        movieData.tmdb?.vote_average || null,
        movieData.imdb?.vote_average || null,
        movieData.imdb?.vote_count || 0,
        movieData.view || 0,
    );

    // Lay movie id
    const rows: any[] = await prisma.$queryRawUnsafe(
        'SELECT id FROM movies WHERE slug = $1', movieData.slug
    );
    const movieId = rows[0]?.id;
    if (!movieId) return;

    // Gom tat ca episodes & Loc trung (Dung Set de tranh loi 23505)
    const allEps: any[] = [];
    const seen = new Set();
    for (const server of episodes) {
        for (const ep of server.server_data ?? []) {
            if (!ep.name) continue;
            const key = `${server.server_name}-${ep.name}`;
            if (seen.has(key)) continue;
            seen.add(key);

            allEps.push({
                serverName: server.server_name || '',
                episodeName: ep.name,
                linkM3u8: ep.link_m3u8 || null,
                linkEmbed: ep.link_embed || null,
            });
        }
    }

    if (allEps.length > 0) {
        // 2 round-trips thay vi N*2: xoa cu roi bulk insert moi
        await prisma.$executeRawUnsafe('DELETE FROM episodes WHERE movie_id = $1::uuid', movieId);

        const valuePlaceholders = allEps.map((_, i) => {
            const b = i * 5;
            return `(gen_random_uuid(), $${b + 1}::uuid, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, now())`;
        }).join(', ');

        const params: any[] = [];
        for (const ep of allEps) {
            params.push(movieId, ep.serverName, ep.episodeName, ep.linkM3u8, ep.linkEmbed);
        }

        await prisma.$executeRawUnsafe(
            `INSERT INTO episodes (id, movie_id, server_name, episode_name, link_m3u8, link_embed, created_at) VALUES ${valuePlaceholders}`,
            ...params
        );
    }
}

// ── Main crawl loop ──
async function main() {
    console.log('');
    console.log('=== CRAWL OPHIM => SUPABASE (Optimized) ===');
    console.log('');

    const firstPage = await fetchWithRetry(`${OPHIM_API}/v1/api/danh-sach/phim-moi-cap-nhat?page=1`);
    const pagination = firstPage?.data?.params?.pagination ?? {};
    const totalItems = pagination.totalItems ?? 0;
    const perPage = pagination.totalItemsPerPage ?? 24;
    const totalPages = Math.ceil(totalItems / perPage);

    console.log(`Tong phim: ${totalItems.toLocaleString()}`);
    console.log(`Tong trang: ${totalPages} (${perPage} phim/trang)`);
    console.log(`Bat dau tu trang: ${START_PAGE}`);
    console.log(`Xu ly song song: ${CONCURRENCY} phim/batch`);
    console.log('─'.repeat(50));
    console.log('');

    const startTime = Date.now();
    let totalSynced = 0;
    let totalErrors = 0;
    let totalSkipped = 0;

    for (let page = START_PAGE; page <= totalPages; page++) {
        const pageStart = Date.now();

        try {
            const data = await fetchWithRetry(`${OPHIM_API}/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`);
            const movies = data?.data?.items ?? [];

            if (movies.length === 0) {
                console.log(`Trang ${page}: trong -> dung!`);
                break;
            }

            let pageSynced = 0;
            let pageErrors = 0;

            // Xu ly song song theo batch CONCURRENCY phim
            for (let i = 0; i < movies.length; i += CONCURRENCY) {
                const batch = movies.slice(i, i + CONCURRENCY);
                const results = await Promise.allSettled(
                    batch.map(async (movie: any) => {
                        try {
                            const detail = await fetchWithRetry(`${OPHIM_API}/v1/api/phim/${movie.slug}`);
                            const movieData = detail?.data?.item;
                            if (!movieData) return { status: 'skipped', slug: movie.slug };
                            const eps = movieData?.episodes ?? [];
                            await upsertMovie(movieData, eps);
                            return { status: 'ok', slug: movie.slug };
                        } catch (err: any) {
                            err.movieSlug = movie.slug;
                            throw err;
                        }
                    })
                );

                for (const r of results) {
                    if (r.status === 'fulfilled') {
                        if (r.value.status === 'skipped') totalSkipped++;
                        else { pageSynced++; totalSynced++; }
                    } else {
                        pageErrors++;
                        totalErrors++;
                        const slug = (r as any).reason?.movieSlug || 'unknown';
                        const msg = (r as any).reason?.message?.substring(0, 100);
                        console.error(`  [Loi Phim: ${slug}] ${msg}`);
                    }
                }
                await sleep(DELAY_MS);
            }

            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            const pageTime = ((Date.now() - pageStart) / 1000).toFixed(1);
            const eta = totalSynced > 0
                ? Math.round(((Date.now() - startTime) / totalSynced) * (totalItems - totalSynced - totalSkipped) / 1000 / 60)
                : '?';

            console.log(
                `[Trang ${String(page).padStart(4)}/${totalPages}] ` +
                `OK:${pageSynced}/${movies.length} | ` +
                `Tong:${totalSynced} | ` +
                `Loi:${totalErrors} | ` +
                `${pageTime}s | ETA:~${eta}phut`
            );

            await sleep(PAGE_DELAY_MS);
        } catch (err: any) {
            console.error(`Loi trang ${page}: ${err.message}. Tiep tuc...`);
            totalErrors++;
            await sleep(2000);
        }
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log('');
    console.log('='.repeat(50));
    console.log(`HOAN TAT!`);
    console.log(`  Tong phim dong bo: ${totalSynced.toLocaleString()}`);
    console.log(`  Bo qua:           ${totalSkipped}`);
    console.log(`  Loi:              ${totalErrors}`);
    console.log(`  Thoi gian:        ${totalTime} phut`);
    console.log('='.repeat(50));
}

process.on('unhandledRejection', (reason) => {
    console.error('[FATAL unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[FATAL uncaughtException]', err.message);
});

main()
    .catch((err) => {
        console.error('[FATAL main error]', err.message);
    })
    .finally(() => {
        prisma.$disconnect();
        process.exit(0);
    });
