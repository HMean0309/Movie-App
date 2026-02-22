import { useEffect, useState } from 'react';
import { watchlistApi } from '../../api/watchlist.api';
import MovieCard from '../../components/movie/MovieCard';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

export default function WatchlistPage() {
    const [movies, setMovies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        watchlistApi.getAll()
            .then((res) => {
                setMovies(res.data.data);
            })
            .catch((err) => {
                console.error('Lỗi khi fetch watchlist:', err);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen pt-[120px] pb-20 px-4 md:px-8 max-w-7xl mx-auto">
                <div className="w-48 h-10 bg-surface rounded animate-pulse mb-8" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="aspect-[2/3] bg-surface rounded-md animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-[120px] pb-20 px-4 md:px-8 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
                DANH SÁCH CỦA TÔI
                <span className="text-sm font-normal text-gray-500 bg-surface px-3 py-1 rounded-full">
                    {movies.length} Phim
                </span>
            </h1>

            {movies.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {movies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-900/40 rounded-xl border border-gray-800">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Play className="w-8 h-8 text-gray-400 opacity-50" />
                    </div>
                    <p className="text-xl font-bold text-white mb-2">Chưa có phim nào trong danh sách</p>
                    <p className="text-gray-400 mb-8 max-w-md">
                        Hãy khám phá thêm các bộ phim hấp dẫn và nhấn "Thêm vào DS" để lưu lại nhé.
                    </p>
                    <Link
                        to="/"
                        className="px-6 py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded shadow-lg transition-colors"
                    >
                        Khám phá ngay
                    </Link>
                </div>
            )}
        </div>
    );
}
