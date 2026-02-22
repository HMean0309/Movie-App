import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/bullmq';
import { prisma } from '../lib/prisma';


interface SyncMoviesJobData {
  page: number;
}

async function fetchMovies(page: number): Promise<any> {
  const url = `${process.env.OPHIM_API_URL}/v1/api/danh-sach/phim-moi-cap-nhat?page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OPhim API lỗi: ${res.status}`);
  return res.json();
}

async function fetchMovieDetail(slug: string): Promise<any> {
  const url = `${process.env.OPHIM_API_URL}/v1/api/phim/${slug}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không lấy được detail: ${slug}`);
  return res.json();
}

export const syncMoviesWorker = new Worker<SyncMoviesJobData>(
  'sync-movies',
  async (job: Job<SyncMoviesJobData>) => {
    const { page } = job.data;
    console.log(`[SyncJob] Đang sync trang ${page}...`);

    // Bước 1: Lấy danh sách phim trang đó
    const data = await fetchMovies(page);
    const movies = data?.data?.items ?? [];

    if (movies.length === 0) {
      console.log(`[SyncJob] Trang ${page} không có phim, dừng lại.`);
      return { synced: 0 };
    }

    let synced = 0;

    // Bước 2: Với mỗi phim, lấy detail + upsert vào DB
    for (const movie of movies) {
      try {
        const detail = await fetchMovieDetail(movie.slug);

        const movieData = detail?.data?.item;
        const episodes = movieData?.episodes ?? [];

        if (!movieData) continue;

        let tmdbImages: any = null;
        try {
          const imgUrl = `${process.env.OPHIM_API_URL}/v1/api/phim/${movie.slug}/images`;
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const imgData = await imgRes.json() as any;
            tmdbImages = imgData?.data;
          }
        } catch (e) { }

        const CDN = 'https://img.ophim.cc/uploads/movies/';

        const updateData: any = {
          name: movieData.name,
          originName: movieData.origin_name,
          posterUrl: movieData.poster_url?.startsWith('http') ? movieData.poster_url : `${CDN}${movieData.poster_url}`,
          thumbUrl: movieData.thumb_url?.startsWith('http') ? movieData.thumb_url : `${CDN}${movieData.thumb_url}`,
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
          view: movieData.view || 0,
          syncedAt: new Date(),
        };

        if (tmdbImages?.poster?.original || tmdbImages?.poster) {
          updateData.tmdbPoster = tmdbImages.poster.original || tmdbImages.poster;
        }
        if (tmdbImages?.backdrop?.original || tmdbImages?.backdrop || tmdbImages?.backdrops?.[0]?.file_path) {
          updateData.tmdbBackdrop = tmdbImages.backdrop?.original || tmdbImages.backdrop || tmdbImages.backdrops?.[0]?.file_path;
        }

        const savedMovie = await prisma.movie.upsert({
          where: { slug: movieData.slug },
          update: updateData,
          create: {
            ophimId: movieData._id,
            slug: movieData.slug,
            type: movieData.type === 'single' ? 'single' : 'series',
            ...updateData,
          },
        });

        // Upsert từng tập phim
        for (const server of episodes) {
          for (const ep of server.server_data ?? []) {
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
          }
        }

        synced++;
      } catch (err) {
        console.error(`[SyncJob] Lỗi phim ${movie.slug}:`, err);
      }
    }

    console.log(`[SyncJob] Trang ${page}: sync ${synced}/${movies.length} phim`);
    return { synced };
  },
  { connection: redisConnection, concurrency: 2 }
);

syncMoviesWorker.on('completed', (job) => {
  console.log(`[SyncJob] Job ${job.id} hoàn thành`);
});

syncMoviesWorker.on('failed', (job, err) => {
  console.error(`[SyncJob] Job thất bại:`, err.cause ?? err.message);
  console.error(`[SyncJob] Job ${job?.id} thất bại:`, err.message);
});
