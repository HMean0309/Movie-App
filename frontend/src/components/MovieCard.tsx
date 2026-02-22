import { Link } from 'react-router-dom';

interface Props {
  movie: {
    slug: string;
    name: string;
    originName?: string;
    posterUrl?: string;
    thumbUrl?: string;
    year?: number;
    type?: string;
    status?: string;
  };
}

export default function MovieCard({ movie }: Props) {
  return (
    <Link to={`/movie/${movie.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-lg bg-gray-800 aspect-[2/3]">
        <img
          src={movie.posterUrl || movie.thumbUrl || '/placeholder.jpg'}
          alt={movie.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          loading="lazy"
        />
        {/* Badge loại phim */}
        <div className="absolute top-2 left-2">
          <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
            {movie.type === 'single' ? 'Phim lẻ' : 'Phim bộ'}
          </span>
        </div>

        {movie.status && (
          <div className="absolute top-2 right-2">
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
              {movie.status}
            </span>
          </div>
        )}

        {/* Overlay khi hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
          <span className="text-white font-semibold text-sm">▶ Xem ngay</span>
        </div>
      </div>
      <div className="mt-2 px-1">
        <p className="text-white text-sm font-medium line-clamp-1">{movie.name}</p>
        <p className="text-gray-400 text-xs">{movie.year}</p>
      </div>
    </Link>
  );
}
