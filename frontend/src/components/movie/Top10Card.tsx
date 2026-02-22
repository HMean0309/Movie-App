import { Link } from 'react-router-dom';
import { getImageUrl } from './MovieCard';

interface Movie {
    slug: string;
    name: string;
    posterUrl?: string;
    thumbUrl?: string;
}

interface Top10CardProps {
    movie: Movie;
    rank: number;
}

export default function Top10Card({ movie, rank }: Top10CardProps) {
    return (
        <Link to={`/movie/${movie.slug}`} className="group/top10 relative flex items-end h-[240px] md:h-[300px] shrink-0 snap-start pr-4 hover:-translate-y-2 transition-transform duration-300">
            {/* Ranked number SVG / STYLING */}
            <div className="absolute left-0 bottom-[-20px] z-0 text-[120px] md:text-[180px] font-black leading-none tracking-tighter text-black" style={{ WebkitTextStroke: '4px #333' }}>
                {rank}
            </div>

            {/* Movie Poster */}
            <div className="relative z-10 ml-[40px] md:ml-[60px] w-[120px] md:w-[150px] aspect-[2/3] overflow-hidden rounded-md shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <img
                    src={getImageUrl(movie.posterUrl || movie.thumbUrl)}
                    alt={movie.name}
                    className="w-full h-full object-cover group-hover/top10:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-transparent group-hover/top10:bg-white/10 transition-colors"></div>
                {rank === 1 && (
                    <div className="absolute top-0 right-0 bg-brand text-white text-[10px] font-bold px-2 py-1 select-none">
                        TOP 10
                    </div>
                )}
            </div>
        </Link>
    );
}
