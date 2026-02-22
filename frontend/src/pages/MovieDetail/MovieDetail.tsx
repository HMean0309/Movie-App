import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { movieApi } from '../../api/movie.api';
import { watchlistApi } from '../../api/watchlist.api';
import { watchPartyApi } from '../../api/watchparty.api';
import { useAuthStore } from '../../store/useAuthStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Play, Plus, Video, Star, Check, Users } from 'lucide-react';
import { getImageUrl } from '../../components/movie/MovieCard';
import ReviewSection from '../../components/Review/ReviewSection';

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

interface MovieDetail {
  id: string;
  slug: string;
  name: string;
  originName?: string;
  posterUrl?: string;
  thumbUrl?: string;
  description?: string;
  year?: number;
  type?: string;
  status?: string;
  categories?: string[];
  countries?: string[];
  actors?: string[];
  directors?: string[];
  time?: string;
  quality?: string;
  lang?: string;
  episodeCurrent?: string;
  episodeTotal?: string;
  tmdbVote?: number;
  tmdbPoster?: string;
  tmdbBackdrop?: string;
  view?: number;
}

// MOCK_CAST and extra mock data removed

export default function MovieDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [related, setRelated] = useState<MovieDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeServer, setActiveServer] = useState(0);
  const [activeTab, setActiveTab] = useState<'episodes' | 'details'>('episodes');

  const { isAuthenticated } = useAuthStore();
  const [isInList, setIsInList] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isCreatingParty, setIsCreatingParty] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    movieApi.getMovieBySlug(slug)
      .then((res) => {
        // Backend trả về res.data.data là movie object có chứa mảng episodes
        const movieData = res.data.data;
        if (!movieData) {
          setMovie(null);
          return;
        }
        setMovie(movieData);

        if (movieData.id && isAuthenticated) {
          watchlistApi.check(movieData.id).then(res => {
            setIsInList(res.data.data.isInList);
          }).catch(console.error);
        }

        // Chuyển đổi type server nếu cần thiết (Vì backend ko có servers)
        if (movieData.episodes && movieData.episodes.length > 0) {
          // Group by serverName & map episodeName -> name
          const grouped: Record<string, any[]> = {};
          for (const ep of movieData.episodes) {
            const sName = ep.serverName || 'Server 1';
            if (!grouped[sName]) grouped[sName] = [];
            grouped[sName].push({
              id: ep.id,
              name: ep.episodeName || ep.name || `Tập ${grouped[sName].length + 1}`,
              linkM3u8: ep.linkM3u8,
              linkEmbed: ep.linkEmbed,
            });
          }
          const mappedServers = Object.keys(grouped).map(sName => ({
            serverName: sName,
            episodes: grouped[sName],
          }));
          setServers(mappedServers);
        } else {
          setServers([]);
        }

        if (movieData.type === 'series' || movieData.episodes?.length > 0) {
          setActiveTab('episodes');
        } else {
          setActiveTab('details');
        }

        if (movieData.categories?.length > 0) {
          movieApi.getMovies({ category: movieData.categories[0], limit: 8 })
            .then((relRes) => {
              if (relRes?.data?.data?.movies) {
                setRelated(relRes.data.data.movies.filter((m: MovieDetail) => m.slug !== slug));
              }
            })
            .catch(console.error);
        }
      })
      .catch((err) => {
        console.error("Lỗi fetch chi tiết phim:", err);
        setMovie(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-[120px]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 flex gap-8">
            <div className="w-[300px] h-[450px] bg-surface rounded-lg animate-pulse shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="w-48 h-8 bg-surface rounded animate-pulse" />
              <div className="w-full h-12 bg-surface rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-5xl mb-4">🎬</p>
          <p className="text-xl">Không tìm thấy phim</p>
          <Link to="/" className="mt-4 inline-block text-brand hover:underline">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const backdropImage = movie.tmdbBackdrop || getImageUrl(movie.thumbUrl || movie.posterUrl);
  const posterImage = movie.tmdbPoster || getImageUrl(movie.posterUrl || movie.thumbUrl);

  const handleToggleList = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!movie?.id || isToggling) return;

    setIsToggling(true);
    try {
      if (isInList) {
        await watchlistApi.remove(movie.id);
        setIsInList(false);
      } else {
        await watchlistApi.add(movie.id);
        setIsInList(true);
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật danh sách:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCreateParty = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!movie?.id || isCreatingParty) return;
    setIsCreatingParty(true);
    try {
      // Lấy episodeId đầu tiên từ server đầu tiên (nếu có)
      const firstEpisodeId = servers[0]?.episodes[0]?.id;
      const res = await watchPartyApi.createRoom(movie.id, firstEpisodeId);
      navigate(`/watch-party/${res.data.data.id}`);
    } catch (error) { console.error('Lỗi khi tạo phòng:', error); }
    finally { setIsCreatingParty(false); }
  };

  return (
    <div className="min-h-screen pb-20 bg-background relative">
      {/* ── Full Width Hero Backdrop (Thumb/Landscape Image) ── */}
      <div className="relative w-full h-[50vh] md:h-[65vh] xl:h-[75vh] overflow-hidden">
        <img
          src={backdropImage}
          alt={movie.name}
          className="absolute inset-0 w-full h-full object-cover object-top"
          loading="eager"
          fetchPriority="high"
        />
        {/* Soft blackout layer over background to make text readable */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Gradient completely fading to Background color at the bottom */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-[-120px] md:mt-[-280px] relative z-10 w-full animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 xl:gap-16">

          {/* ── LEFT AREA (Main Content) ── */}
          <div className="lg:col-span-8">

            {/* Top Section: Portrait Poster + Info Overlay */}
            <div className="flex flex-col md:flex-row gap-8 items-start mb-12">

              {/* Portrait Poster on the left */}
              <div className="shrink-0 w-[200px] md:w-[260px] mx-auto md:mx-0 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-gray-600/30 bg-surface">
                <img
                  src={posterImage}
                  alt={movie.name}
                  className="w-full h-auto aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Info Detail on the right */}
              <div className="flex-1 flex flex-col pt-4 md:pt-16 text-center md:text-left">
                {/* Meta Tags */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs font-bold text-gray-200 mb-4 tracking-wider drop-shadow-md">
                  <Badge variant="solid" className="bg-brand text-white">{movie.type === 'single' ? 'MOVIE' : 'SERIES'}</Badge>
                  <span className="text-brand">•</span>
                  <span>{movie.year || new Date().getFullYear()}</span>
                  <span className="text-brand">•</span>
                  <Badge variant="outline" className="border-gray-400 text-gray-100 px-2">{movie.status === 'completed' ? 'Hoàn tất' : 'Đang cập nhật'}</Badge>
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-2 uppercase tracking-tight leading-tight drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                  {movie.name}
                </h1>

                {movie.originName && (
                  <h2 className="text-xl md:text-2xl font-bold text-gray-300 mb-6 drop-shadow-md">
                    {movie.originName}
                  </h2>
                )}

                {/* Categories */}
                {movie.categories && (
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                    {movie.categories.slice(0, 3).map((cat) => (
                      <span key={cat} className="px-3 py-1 bg-white/10 text-gray-300 rounded-full text-xs font-medium">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}

                {movie.description ? (
                  <div
                    className="text-gray-300 text-lg leading-relaxed mb-8 line-clamp-4"
                    dangerouslySetInnerHTML={{ __html: movie.description }}
                  />
                ) : (
                  <p className="text-gray-300 text-lg leading-relaxed mb-8 line-clamp-4">
                    Một hành trình đầy cảm xúc với những bước ngoặt không ai ngờ tới.
                  </p>
                )}

                {/* TMDB Rating */}
                {movie.tmdbVote ? (
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex text-yellow-500">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-5 h-5 ${s <= Math.round(movie.tmdbVote! / 2) ? 'fill-current' : 'text-gray-600'}`}
                        />
                      ))}
                    </div>
                    <div className="text-white font-bold text-2xl">
                      {movie.tmdbVote.toFixed(1)} <span className="text-gray-400 text-sm font-normal">/ 10 (TMDB)</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-8 text-gray-500 text-sm">
                    <Star className="w-4 h-4" /> Chưa có đánh giá
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    className="font-black tracking-wide bg-red-600 hover:bg-red-800 text-white shadow-[0_4px_15px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.6)]"
                    icon={<Play className="w-5 h-5 fill-current group-hover:scale-125 transition-transform duration-300" />}
                    onClick={() => navigate(`/watch/${movie.slug}?server=0&ep=0`)}
                  >
                    Xem ngay
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={isInList ? <Check className="w-5 h-5 text-green-500" /> : <Plus className="w-5 h-5" />}
                    onClick={handleToggleList}
                    disabled={isToggling}
                  >
                    {isInList ? 'Đã thêm' : 'Thêm vào DS'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    icon={<Users className="w-5 h-5" />}
                    onClick={handleCreateParty}
                    disabled={isCreatingParty}
                  >
                    {isCreatingParty ? 'Đang tạo...' : 'Watch Party'}
                  </Button>
                  <Button variant="secondary" size="lg" className="px-4">
                    <Video className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="border-b border-gray-800 mb-8 mt-12">
              <div className="flex gap-8 overflow-x-auto scrollbar-hide">
                {(['episodes', 'details'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 text-base font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === tab
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                  >
                    {tab === 'episodes' ? 'Danh sách tập' : 'Chi tiết bổ sung'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[200px]">
              {activeTab === 'details' && (
                <div className="animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Trạng thái</span>
                      <span className="text-white font-medium">{movie.status === 'completed' ? 'Hoàn tất' : movie.status === 'ongoing' ? 'Đang cập nhật' : movie.status || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Quốc gia</span>
                      <span className="text-white font-medium">
                        {movie.countries && movie.countries.length > 0 ? movie.countries.join(', ') : 'Đang cập nhật'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Thể loại</span>
                      <span className="text-white font-medium">
                        {movie.categories && movie.categories.length > 0 ? movie.categories.join(', ') : 'Đang cập nhật'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Thời lượng</span>
                      <span className="text-white font-medium">{movie.time || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Chất lượng</span>
                      <span className="text-white font-medium">{movie.quality || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Ngôn ngữ</span>
                      <span className="text-white font-medium">{movie.lang || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Tập hiện tại</span>
                      <span className="text-white font-medium">{movie.episodeCurrent || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Tổng số tập</span>
                      <span className="text-white font-medium">{movie.episodeTotal || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-2">Năm phát hành</span>
                      <span className="text-white font-medium">{movie.year || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Diễn viên */}
                  {movie.actors && movie.actors.length > 0 && movie.actors.some(a => a) && (
                    <div className="mt-6 pt-6 border-t border-gray-800">
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-3">Diễn viên</span>
                      <div className="flex flex-wrap gap-2">
                        {movie.actors.filter(a => a).map((actor, i) => (
                          <span key={i} className="px-3 py-1.5 bg-surface text-gray-300 rounded-full text-sm font-medium border border-gray-700">
                            {actor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Đạo diễn */}
                  {movie.directors && movie.directors.length > 0 && movie.directors.some(d => d) && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-3">Đạo diễn</span>
                      <div className="flex flex-wrap gap-2">
                        {movie.directors.filter(d => d).map((dir, i) => (
                          <span key={i} className="px-3 py-1.5 bg-surface text-gray-300 rounded-full text-sm font-medium border border-gray-700">
                            {dir}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'episodes' && (
                <div className="animate-fade-in">
                  {servers.length === 0 ? (
                    <div className="py-8 text-center bg-surface border border-gray-800 rounded-lg">
                      <p className="text-gray-400 font-medium">Chưa có tập phim nào được cập nhật.</p>
                    </div>
                  ) : (
                    <>
                      {servers.length > 1 && (
                        <div className="flex gap-2 mb-6 flex-wrap">
                          {servers.map((server, idx) => (
                            <button
                              key={idx}
                              onClick={() => setActiveServer(idx)}
                              className={`px-4 py-1.5 rounded text-sm font-medium transition ${activeServer === idx
                                ? 'bg-white text-black'
                                : 'bg-surface text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                              {server.serverName}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
                        {servers[activeServer]?.episodes.map((ep, idx) => {
                          const displayName = ep.name.toLowerCase().startsWith('tập')
                            ? ep.name.replace(/tập\s*/i, 'Tập ')
                            : (ep.name.toLowerCase() === 'full' ? 'Full' : `Tập ${ep.name}`);

                          return (
                            <Link
                              key={idx}
                              to={`/watch/${movie.slug}?server=${activeServer}&ep=${idx}`}
                              className="px-3 py-2.5 text-center bg-surface hover:bg-red-600 text-gray-300 hover:text-white rounded-md transition-colors font-medium border border-gray-800 hover:border-red-600 truncate text-sm"
                            >
                              {displayName}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Thêm mục Review ── */}
            <ReviewSection movieId={movie.id} />
          </div>

          {/* ── RIGHT AREA (More Like This) ── */}
          <div className="lg:col-span-4">
            <h3 className="text-2xl font-bold text-white mb-6">More Like This</h3>
            <div className="flex flex-col gap-4">
              {related.slice(0, 4).map((m) => (
                <Link
                  key={m.id}
                  to={`/movie/${m.slug}`}
                  className="flex gap-4 p-3 rounded-md bg-surface border border-gray-800 hover:bg-surface-hover hover:border-gray-600 transition-colors group"
                >
                  <div className="w-20 aspect-[2/3] shrink-0 rounded overflow-hidden">
                    <img
                      src={getImageUrl(m.posterUrl || m.thumbUrl)}
                      alt={m.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-white font-bold text-base leading-tight mb-1 group-hover:text-brand transition-colors">
                      {m.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                      <span>{m.year}</span>
                      <span>•</span>
                      <span>{m.categories?.[0] || 'Movie'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-white mb-2">
                      <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                      8.5
                    </div>
                    <p className="text-gray-500 text-xs line-clamp-2">
                      {m.description || 'Xem ngay trên StreamX.'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
