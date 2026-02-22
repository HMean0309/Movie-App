import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';

interface Movie {
    slug: string;
    name: string;
    posterUrl?: string;
    thumbUrl?: string;
    year?: number;
}

interface MovieSliderProps {
    title: string;
    movies: Movie[];
    viewAllLink?: string;
}

export default function MovieSlider({ title, movies, viewAllLink }: MovieSliderProps) {
    const sliderRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (sliderRef.current) {
            const { scrollLeft, clientWidth } = sliderRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth + 100 : scrollLeft + clientWidth - 100;

            sliderRef.current.scrollTo({
                left: scrollTo,
                behavior: 'smooth'
            });
        }
    };

    if (!movies || movies.length === 0) return null;

    return (
        <div className="py-6 px-4 md:px-8 group relative">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
                    {title}
                </h2>
                {viewAllLink && (
                    <button
                        onClick={() => window.location.href = viewAllLink}
                        className="text-sm md:text-base font-bold text-brand hover:text-white transition-colors z-20 relative px-2 py-1 bg-black/40 rounded md:bg-transparent md:px-0 md:py-0"
                    >
                        Xem tất cả
                    </button>
                )}
            </div>

            <div className="relative -mx-4 md:-mx-8">
                {/* Navigation Buttons */}
                <button
                    onClick={(e) => { e.preventDefault(); scroll('left'); }}
                    className="absolute left-0 top-0 z-20 hidden md:flex items-center justify-center w-12 h-full bg-gradient-to-r from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                >
                    <ChevronLeft className="w-8 h-8 text-white drop-shadow-md" />
                </button>

                <div
                    ref={sliderRef}
                    className="flex gap-4 px-4 md:px-8 py-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth relative z-10"
                >
                    {movies.map((movie) => (
                        <div key={movie.slug} className="w-[140px] md:w-[200px] shrink-0 transform transition-transform duration-300 hover:scale-[1.03] hover:z-30">
                            <MovieCard movie={movie} />
                        </div>
                    ))}
                </div>

                <button
                    onClick={(e) => { e.preventDefault(); scroll('right'); }}
                    className="absolute right-0 top-0 z-20 hidden md:flex items-center justify-center w-12 h-full bg-gradient-to-l from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                >
                    <ChevronRight className="w-8 h-8 text-white drop-shadow-md" />
                </button>
            </div>
        </div>
    );
}
