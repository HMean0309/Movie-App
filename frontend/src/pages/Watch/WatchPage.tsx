import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import { movieApi } from '../../api/movie.api';
import { historyApi } from '../../api/history.api';
import { useAuthStore } from '../../store/useAuthStore';
import { getImageUrl } from '../../components/movie/MovieCard';
import CustomVideoPlayer from '../../components/player/CustomVideoPlayer';

interface Episode {
  id?: string;
  name: string;
  linkM3u8?: string;
  linkEmbed?: string;
}

interface Server {
  serverName: string;
  episodes: Episode[];
}

interface MovieInfo {
  id: string;
  slug: string;
  name: string;
  type?: string;
  thumbUrl?: string;
}

export default function WatchPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [movie, setMovie] = useState<MovieInfo | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const serverIdx = parseInt(searchParams.get('server') ?? '0');
  const epIdx = parseInt(searchParams.get('ep') ?? '0');

  const currentEpisode = servers[serverIdx]?.episodes[epIdx];
  const { isAuthenticated } = useAuthStore();

  // ── Load movie data ──────────────────────────────────────────
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    movieApi.getMovieBySlug(slug)
      .then((res) => {
        const movieData = res.data.data;
        if (!movieData) {
          setMovie(null);
          return;
        }

        setMovie(movieData);

        // Map Prisma Episode array to Frontend Server structure
        if (movieData.episodes && movieData.episodes.length > 0) {
          /* 
            Nhóm các episodes cùng chung thuộc tính tính serverName lại.
            Tuy nhiên Prisma hiện tại lưu episodes phẳng, ta mô phỏng lại dạng mảng
          */
          const episodesByServer = movieData.episodes.reduce((acc: any, ep: any) => {
            const sName = ep.serverName || 'Server 1';
            if (!acc[sName]) acc[sName] = [];

            // Map Prisma fields (episodeName) to Frontend interface (name)
            acc[sName].push({
              id: ep.id,
              name: ep.episodeName || `Tập ${acc[sName].length + 1}`,
              linkM3u8: ep.linkM3u8,
              linkEmbed: ep.linkEmbed
            });

            return acc;
          }, {});

          const mappedServers = Object.keys(episodesByServer).map((sName) => ({
            serverName: sName,
            episodes: episodesByServer[sName],
          }));

          setServers(mappedServers);
        } else {
          setServers([]);
        }
      })
      .catch(() => setError('Không thể tải phim. Vui lòng thử lại.'))
      .finally(() => setLoading(false));

    // Fetch related movies
    movieApi.getMovies({ limit: 6 })
      .then(res => {
        const movies = res.data?.data?.movies ?? [];
        setRelatedMovies(movies.filter((m: any) => m.slug !== slug).slice(0, 5));
      })
      .catch(() => { });
  }, [slug]);

  // ── HLS Player ──────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentEpisode?.linkM3u8) return;

    // Destroy old instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(currentEpisode.linkM3u8);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => { });
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError('Lỗi tải stream. Thử server khác.');
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = currentEpisode.linkM3u8;
      video.play().catch(() => { });
    }

    return () => {
      hlsRef.current?.destroy();
    };
  }, [currentEpisode?.linkM3u8]);

  // ── Navigate episode ─────────────────────────────────────────
  const goToEpisode = (sIdx: number, eIdx: number) => {
    setSearchParams({ server: String(sIdx), ep: String(eIdx) });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Save History ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !movie?.id) return;

    const trackProgress = () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0 && !video.paused) {
        historyApi.upsert({
          movieId: movie.id,
          episodeId: currentEpisode?.id,
          progressSeconds: Math.floor(video.currentTime)
        }).catch(() => { });
      }
    };

    const interval = setInterval(trackProgress, 15000);
    return () => clearInterval(interval);
  }, [movie?.id, currentEpisode?.id, isAuthenticated]);

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-gray-400 font-medium tracking-widest uppercase animate-pulse">Chuẩn bị nội dung...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-[72px] pb-20 font-sans">

      {/* ── Video Player Area ── */}
      <div className="w-full bg-black border-b border-gray-900 shadow-2xl">
        <div className="max-w-[1200px] mx-auto">

          {error ? (
            <div className="w-full aspect-video flex items-center justify-center text-center px-4 bg-gray-900/50">
              <div className="p-8 border border-red-500/20 bg-red-500/10 rounded-2xl backdrop-blur-sm">
                <p className="text-red-400 text-xl font-medium mb-4 flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {error}
                </p>
                {currentEpisode?.linkEmbed && (
                  <button
                    onClick={() => window.open(currentEpisode.linkEmbed, '_blank')}
                    className="px-6 py-2 bg-brand text-white rounded font-bold hover:bg-red-800 transition"
                  >
                    Mở Trình phát Dự phòng
                  </button>
                )}
              </div>
            </div>
          ) : currentEpisode?.linkM3u8 ? (
            <CustomVideoPlayer
              videoRef={videoRef}
              poster={movie?.thumbUrl}
              title={movie?.name}
              episodeName={currentEpisode.name}
              onNextEpisode={epIdx < (servers[serverIdx]?.episodes.length ?? 1) - 1 ? () => goToEpisode(serverIdx, epIdx + 1) : undefined}
              onPrevEpisode={epIdx > 0 ? () => goToEpisode(serverIdx, epIdx - 1) : undefined}
              hasNext={epIdx < (servers[serverIdx]?.episodes.length ?? 1) - 1}
              hasPrev={epIdx > 0}
            />
          ) : currentEpisode?.linkEmbed ? (
            <div className="w-full aspect-video bg-black">
              <iframe
                src={currentEpisode.linkEmbed}
                className="w-full h-full border-none"
                allowFullScreen
                allow="autoplay; encrypted-media"
                title="Video Player"
              />
            </div>
          ) : (
            <div className="w-full aspect-video flex items-center justify-center bg-gray-900/50">
              <p className="text-gray-500 text-lg">Không tìm thấy luồng phát Video cho tập này</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Control & Info Section ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 xl:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Main Info Left */}
          <div className="lg:col-span-8 flex flex-col">
            {/* Header Info */}
            <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-gray-800">
              <div>
                <Link
                  to={`/movie/${slug}`}
                  className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-3 font-medium text-sm group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  Quay lại thông tin phim
                </Link>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight">
                  {movie?.name}
                </h1>
                {currentEpisode && (
                  <p className="text-brand text-xl md:text-2xl mt-2 font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                    Đang phát: {currentEpisode.name}
                  </p>
                )}
              </div>

              {/* Prev / Next Player Controls */}
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => goToEpisode(serverIdx, epIdx - 1)}
                  disabled={epIdx === 0}
                  className="flex items-center justify-center w-12 h-12 bg-surface hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-surface text-white rounded-full transition-colors shadow-lg"
                  title="Tập trước"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => goToEpisode(serverIdx, epIdx + 1)}
                  disabled={epIdx >= (servers[serverIdx]?.episodes.length ?? 1) - 1}
                  className="flex items-center justify-center px-6 h-12 bg-surface hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-surface text-white font-bold rounded-full transition-colors border border-gray-700 shadow-lg group"
                >
                  Tập tiếp theo
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            {/* Select Server */}
            {servers.length > 1 && (
              <div className="mb-10 bg-surface/50 p-5 rounded-xl border border-gray-800/50">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                  Nguồn phát dự phòng
                </p>
                <div className="flex gap-3 flex-wrap">
                  {servers.map((server, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToEpisode(idx, 0)}
                      className={`px-5 py-2.5 rounded text-sm font-bold transition-all duration-300 ${serverIdx === idx
                        ? 'bg-brand text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500'
                        : 'bg-black/40 text-gray-400 border border-gray-700 hover:text-white hover:border-gray-500'
                        }`}
                    >
                      {server.serverName}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Episode Grid (For Series) */}
            {servers[serverIdx]?.episodes.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-brand" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 110-2h4a1 1 0 011 1v4a1 1 0 11-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 112 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 110 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 110-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Danh sách tập
                  </h3>
                  <span className="text-sm font-bold text-gray-500 bg-surface px-3 py-1 rounded-full">
                    Tổng: {servers[serverIdx].episodes.length} Tập
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {servers[serverIdx].episodes.map((ep, idx) => {
                    const displayName = ep.name.toLowerCase().startsWith('tập')
                      ? ep.name.replace(/tập\s*/i, 'Tập ')
                      : (ep.name.toLowerCase() === 'full' ? 'Full' : `Tập ${ep.name}`);

                    return (
                      <button
                        key={idx}
                        onClick={() => goToEpisode(serverIdx, idx)}
                        className={`h-10 w-full flex items-center justify-center text-sm rounded-md transition-all font-bold tracking-wider ${epIdx === idx
                          ? 'bg-brand text-white shadow-[0_4px_10px_rgba(220,38,38,0.4)] scale-105'
                          : 'bg-surface hover:bg-gray-700 text-gray-300 hover:text-white'
                          }`}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Related Movies */}
          <div className="lg:col-span-4 hidden lg:block border-l border-gray-800/50 pl-8">
            <h3 className="text-white font-bold tracking-wider uppercase mb-6 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              Có thể bạn sẽ thích
            </h3>

            {relatedMovies.length > 0 ? (
              <div className="flex flex-col gap-4">
                {relatedMovies.map((m: any) => (
                  <button
                    key={m.slug}
                    onClick={() => navigate(`/watch/${m.slug}?server=0&ep=0`)}
                    className="flex gap-4 p-2 rounded-lg bg-surface/30 hover:bg-surface/60 transition-colors text-left group"
                  >
                    <img
                      src={getImageUrl(m.thumbUrl || m.posterUrl)}
                      alt={m.name}
                      className="w-32 aspect-video object-cover rounded flex-shrink-0 group-hover:brightness-125 transition"
                      loading="lazy"
                    />
                    <div className="flex flex-col justify-center min-w-0">
                      <p className="text-white text-sm font-bold truncate group-hover:text-brand transition-colors">{m.name}</p>
                      <p className="text-gray-500 text-xs mt-1">{m.year || ''} · {m.type === 'series' ? 'Phim bộ' : 'Phim lẻ'}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm">Đang tải gợi ý...</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
