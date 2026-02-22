import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { movieApi } from '../../api/movie.api';
import { historyApi } from '../../api/history.api';
import { useAuthStore } from '../../store/useAuthStore';
import MovieCard, { getImageUrl } from '../../components/movie/MovieCard';
import MovieSlider from '../../components/movie/MovieSlider';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Play, Info } from 'lucide-react';

interface Movie {
  id: string;
  slug: string;
  name: string;
  originName?: string;
  posterUrl?: string;
  thumbUrl?: string;
  year?: number;
  type?: string;
  status?: string;
  categories?: string[];
  description?: string;
  tmdbPoster?: string;
  tmdbBackdrop?: string;
  view?: number;
  tmdbVote?: number;
}

// ── Hero Banner ────────────────────────────────────────────────
function HeroBanner({ movie }: { movie: Movie }) {
  const navigate = useNavigate();
  return (
    <div className="relative w-full h-[85vh] md:h-[90vh] min-h-[600px] overflow-hidden bg-background">
      {/* Background image */}
      <img
        src={movie.tmdbBackdrop || getImageUrl(movie.thumbUrl || movie.posterUrl)}
        alt={movie.name}
        className="absolute inset-0 w-full h-full object-cover object-top"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-24 md:pb-32 px-4 md:px-12 pt-32">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-brand text-white font-bold tracking-widest text-[10px]">TOP 10</Badge>
            <span className="text-white font-bold text-sm tracking-widest uppercase drop-shadow-md">#1 IN MOVIES TODAY</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-black text-white mb-6 leading-[1.1] uppercase tracking-tighter drop-shadow-2xl" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
            {movie.name}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-3 text-sm font-bold text-gray-200 mb-6 drop-shadow-md">
            {movie.year && <span>{movie.year}</span>}
            <Badge variant="outline" className="border-gray-400 text-gray-200">{movie.status === 'completed' ? 'Hoàn tất' : 'Đang cập nhật'}</Badge>
            {movie.categories && movie.categories.length > 0 && (
              <span>{movie.categories[0]}</span>
            )}
          </div>

          <div
            className="text-gray-200 text-base md:text-lg mb-8 max-w-2xl line-clamp-3 leading-relaxed drop-shadow-md font-medium"
            dangerouslySetInnerHTML={{ __html: movie.description || "Một hành trình đầy cảm xúc với những bước ngoặt không ai ngờ tới." }}
          />

          {/* Buttons */}
          <div className="flex flex-wrap gap-4 mt-4">
            <Button
              variant="primary"
              size="lg"
              className="px-8 text-lg font-black tracking-wide bg-red-600 hover:bg-red-800 text-white shadow-[0_4px_15px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.6)] group/play"
              icon={<Play className="w-6 h-6 fill-current group-hover/play:scale-125 transition-transform duration-300" />}
              onClick={() => navigate(`/watch/${movie.slug}?server=0&ep=0`)}
            >
              Xem ngay
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="px-8 text-lg bg-black/50 text-white border-none hover:bg-black/70 font-bold backdrop-blur-md"
              icon={<Info className="w-6 h-6" />}
              onClick={() => navigate(`/movie/${movie.slug}`)}
            >
              Thông tin
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Category Filter ────────────────────────────────────────────
export default function HomePage() {
  const [searchParams] = useSearchParams();
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [newSingleMovies, setNewSingleMovies] = useState<Movie[]>([]);
  const [newSeriesMovies, setNewSeriesMovies] = useState<Movie[]>([]);
  const [hotKoreanMovies, setHotKoreanMovies] = useState<Movie[]>([]);
  const [hotChineseMovies, setHotChineseMovies] = useState<Movie[]>([]);
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { isAuthenticated } = useAuthStore();

  const q = searchParams.get('q');
  const typeParam = searchParams.get('type');
  const countryParam = searchParams.get('country');
  const sortParam = searchParams.get('sort');

  useEffect(() => {
    setLoading(true);

    // Nếu có query search hoặc filter mở rộng (xem tất cả)
    if (q || typeParam || countryParam) {
      const fetchParams: any = { limit: 24, sort: sortParam || undefined };
      if (typeParam) fetchParams.type = typeParam;
      if (countryParam) fetchParams.country = countryParam;

      if (q) {
        movieApi.searchMovies(q, 1)
          .then((res) => setTrendingMovies(res.data?.data?.movies || []))
          .finally(() => setLoading(false));
      } else {
        movieApi.getMovies(fetchParams)
          .then((res) => setTrendingMovies(res.data?.data?.movies || []))
          .finally(() => setLoading(false));
      }
      return;
    }

    // Default Home Page View (5 sliders)
    const currentYear = new Date().getFullYear();
    const recentYears = `${currentYear},${currentYear - 1}`; // ví dụ "2026,2025"

    Promise.all([
      movieApi.getMovies({ page: 1, limit: 16, sort: 'trending', year: recentYears as any, excludeCountries: 'Hàn Quốc,Trung Quốc', excludeStatus: 'trailer', minImdb: 6 as any }), // Đề cử All Time (Mới/Nổi nhất)
      movieApi.getMovies({ page: 1, limit: 15, type: 'single' }), // Phim lẻ
      movieApi.getMovies({ page: 1, limit: 15, type: 'series' }), // Phim bộ
      movieApi.getMovies({ page: 1, limit: 15, year: recentYears as any, country: 'Hàn Quốc', sort: 'trending', excludeStatus: 'trailer' }), // Hàn Hot
      movieApi.getMovies({ page: 1, limit: 15, year: recentYears as any, country: 'Trung Quốc', sort: 'trending', excludeStatus: 'trailer' }), // Trung Hot
    ]).then(([trendingRes, singleRes, seriesRes, krRes, cnRes]) => {
      setTrendingMovies(trendingRes.data?.data?.movies || []);
      setNewSingleMovies(singleRes.data?.data?.movies || []);
      setNewSeriesMovies(seriesRes.data?.data?.movies || []);
      setHotKoreanMovies(krRes.data?.data?.movies || []);
      setHotChineseMovies(cnRes.data?.data?.movies || []);
    }).finally(() => setLoading(false));
  }, [q, typeParam, countryParam, sortParam]);

  // Fetch continue watching (only when logged in)
  useEffect(() => {
    if (!isAuthenticated) return;
    historyApi.getAll()
      .then(res => {
        const items = res.data?.data || [];
        // Map sang dạng movie object
        const movies = items.map((item: any) => item.movie).filter(Boolean);
        setContinueWatching(movies);
      })
      .catch(() => { });
  }, [isAuthenticated]);

  const hero = trendingMovies.length > 0 ? trendingMovies[0] : null;

  if (q || typeParam || countryParam) {
    let title = '';
    if (q) title = `Kết quả tìm kiếm: "${q}"`;
    else {
      title = 'Danh sách phim';
      if (countryParam) title = `Phim ${countryParam}`;
      else if (typeParam === 'single') title = 'Phim Lẻ';
      else if (typeParam === 'series') title = 'Phim Bộ';
    }

    return (
      <div className="min-h-screen pt-24 px-4 md:px-12 pb-20">
        <h1 className="text-white text-2xl font-bold mb-8">
          {title}
        </h1>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse" />
            ))}
          </div>
        ) : trendingMovies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {trendingMovies.map((m) => <MovieCard key={m.slug} movie={m} />)}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-32">
            <p className="text-5xl mb-4">🎬</p>
            <p className="text-xl">Không tìm thấy phim nào</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Banner */}
      {loading ? (
        <div className="w-full h-[85vh] bg-surface animate-pulse" />
      ) : hero ? (
        <HeroBanner movie={hero} />
      ) : null}

      <div className={`relative z-20 ${hero ? '-mt-16 md:-mt-24' : 'pt-24 mt-0'} mb-12 px-4 md:px-12`}>
        {loading ? (
          <div className="space-y-12">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="w-48 h-8 bg-surface rounded animate-pulse mb-4" />
                <div className="flex gap-4 overflow-hidden">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="shrink-0 w-[200px] aspect-[2/3] bg-surface rounded-md animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 md:space-y-12">
            {continueWatching.length > 0 && (
              <div className="relative">
                <MovieSlider title="▶︎ Tiếp tục xem" movies={continueWatching} viewAllLink="/watchlist" />
              </div>
            )}

            <div className="relative">
              <MovieSlider title="Phim Đề Cử (Trending)" movies={trendingMovies.slice(1)} />
            </div>

            <div className="relative">
              <MovieSlider title="Phim Lẻ Mới Cập Nhật" movies={newSingleMovies} viewAllLink="/?type=single" />
            </div>

            <div className="relative mt-8">
              <MovieSlider title="Phim Bộ Mới Cập Nhật" movies={newSeriesMovies} viewAllLink="/?type=series" />
            </div>

            <div className="relative mt-8">
              <MovieSlider title="Phim Hàn Đang Hot" movies={hotKoreanMovies} viewAllLink="/?country=Hàn Quốc&sort=trending" />
            </div>

            <div className="relative mt-8">
              <MovieSlider title="Phim Trung Đang Hot" movies={hotChineseMovies} viewAllLink="/?country=Trung Quốc&sort=trending" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
