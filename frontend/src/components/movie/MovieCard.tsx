import { Link, useNavigate } from 'react-router-dom';
import { Play, Plus } from 'lucide-react';

interface Movie {
    slug: string;
    name: string;
    posterUrl?: string;
    thumbUrl?: string;
    year?: number;
    tmdbPoster?: string;
    tmdbBackdrop?: string;
    view?: number;
    tmdbVote?: number;
}

export const getImageUrl = (url?: string) => {
    if (!url) return '/placeholder.jpg';
    if (url.startsWith('http')) {
        return url.replace(/img\.ophim\.[a-z]+/g, 'img.ophim.live');
    }
    return `https://img.ophim.live/uploads/movies/${url}`;
};

export default function MovieCard({ movie }: { movie: Movie }) {
    const navigate = useNavigate();

    return (
        <Link to={`/movie/${movie.slug}`} className="group/card relative block aspect-[2/3] overflow-hidden rounded-md bg-zinc-900 w-full shrink-0 snap-start">
            <img
                src={movie.tmdbPoster || getImageUrl(movie.posterUrl || movie.thumbUrl)}
                alt={movie.name}
                className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700 ease-out"
                loading="lazy"
            />

            {/* Dark gradient for base text visibility */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent"></div>

            {/* Active overlay shown on hover */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/card:opacity-100 transition-all duration-300 flex flex-col justify-end p-4 z-20">
                <div className="translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300 flex flex-col h-full justify-end">
                    <h4 className="text-white font-bold text-base leading-tight mb-2 shadow-black drop-shadow-lg line-clamp-2">{movie.name}</h4>

                    <div className="flex items-center text-gray-300 text-[11px] gap-2 mb-4 font-medium">
                        <span className="text-green-500 font-bold">98% Match</span>
                        <span>{movie.year || new Date().getFullYear()}</span>
                    </div>

                    <div className="flex gap-2">
                        <button
                            className="flex-1 bg-red-600 text-white py-1.5 rounded flex items-center justify-center gap-1 font-bold text-sm shadow-[0_4px_10px_rgba(220,38,38,0.4)] hover:bg-red-800 hover:shadow-[0_4px_15px_rgba(220,38,38,0.6)] hover:scale-105 transition-all duration-300 group/play"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/watch/${movie.slug}?server=0&ep=0`);
                            }}
                        >
                            <Play className="w-4 h-4 fill-current group-hover/play:scale-125 transition-transform" /> Xem
                        </button>
                        <button
                            className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-white hover:text-white text-gray-300 transition shrink-0 bg-black/50"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Optional add to list logic here later
                            }}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Title visible initially, hidden on hover */}
            <div className="absolute inset-x-0 bottom-0 p-3 group-hover/card:opacity-0 transition-opacity duration-300 z-10 pointer-events-none">
                <h4 className="text-white text-sm font-semibold truncate drop-shadow-md">{movie.name}</h4>
            </div>
        </Link>
    );
}
