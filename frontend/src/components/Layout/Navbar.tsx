import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { movieApi } from '../../api/movie.api';
import { getImageUrl } from '../movie/MovieCard';
import { Search, Bell, User, X, Users } from 'lucide-react';

interface SearchResult {
  id: string;
  slug: string;
  name: string;
  year?: number;
  thumbUrl?: string;
  posterUrl?: string;
  tmdbPoster?: string;
}

export default function Navbar() {
  const [search, setSearch] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Realtime search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (search.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await movieApi.searchMovies(search.trim(), 1);
        const movies = res.data?.data?.movies || [];
        setSuggestions(movies.slice(0, 8));
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setShowDropdown(false);
      setSearch('');
      inputRef.current?.blur();
      navigate(`/?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleSelectSuggestion = (slug: string) => {
    setShowDropdown(false);
    setSearch('');
    inputRef.current?.blur();
    navigate(`/movie/${slug}`);
  };

  const navLinks = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Phim lẻ', path: '/?type=single' },
    { name: 'Phim bộ', path: '/?type=series' },
    { name: 'Danh sách', path: '/watchlist' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isScrolled ? 'bg-background shadow-lg' : 'bg-transparent bg-gradient-to-b from-black/80 to-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-brand shrink-0 flex items-center gap-2 tracking-tight">
            <div className="w-3.5 h-3.5 bg-brand rotate-45 rounded-[2px] shadow-[0_0_10px_rgba(229,9,20,0.5)]"></div>
            StreamX
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map((link) => {
              const isActive = location.pathname + location.search === link.path ||
                (link.path.includes('?') && location.search.includes(link.path.split('?')[1]));
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`transition-colors relative pb-1 ${isActive ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                >
                  {link.name}
                  {isActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand rounded-full"></span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4 md:gap-5">
          {/* Search */}
          <div ref={searchRef} className="relative hidden md:block">
            <form onSubmit={handleSearch} className="flex items-center relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                placeholder="Tìm kiếm phim..."
                className="w-48 lg:w-64 pl-9 pr-8 py-1.5 bg-black/40 border border-gray-600/50 text-white rounded-md text-sm focus:outline-none focus:border-gray-500 focus:bg-black/60 focus:w-72 transition-all duration-300 placeholder:text-gray-400"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); setSuggestions([]); setShowDropdown(false); }} className="absolute right-2 text-gray-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Suggestion Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[320px]">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : suggestions.length > 0 ? (
                  <>
                    <div className="px-3 py-2 text-xs text-gray-500 font-bold uppercase tracking-wider border-b border-gray-800">
                      Kết quả gợi ý
                    </div>
                    <ul>
                      {suggestions.map((movie) => (
                        <li key={movie.slug}>
                          <button
                            onClick={() => handleSelectSuggestion(movie.slug)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left"
                          >
                            <img
                              src={movie.tmdbPoster || getImageUrl(movie.thumbUrl || movie.posterUrl)}
                              alt={movie.name}
                              className="w-10 h-14 object-cover rounded flex-shrink-0 bg-gray-800"
                            />
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium truncate">{movie.name}</p>
                              {movie.year && <p className="text-gray-500 text-xs mt-0.5">{movie.year}</p>}
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-gray-800">
                      <button
                        onClick={() => { setShowDropdown(false); navigate(`/?q=${encodeURIComponent(search.trim())}`); }}
                        className="w-full text-center py-2.5 text-brand text-sm font-medium hover:bg-gray-800 transition-colors"
                      >
                        Xem tất cả kết quả →
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-gray-400 text-sm">Không tìm thấy phim nào</div>
                )}
              </div>
            )}
          </div>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/watch-party"
                title="Watch Party"
                className="text-gray-300 hover:text-brand transition-colors"
              >
                <Users className="w-5 h-5" />
              </Link>
              <button className="text-gray-300 hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full overflow-hidden border border-gray-600 bg-gray-800 hover:border-brand transition-colors"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-white font-semibold text-sm truncate">{user?.fullName || 'Người dùng'}</p>
                      <p className="text-gray-400 text-xs truncate">{user?.email}</p>
                    </div>
                    <Link to="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm">
                      Tài khoản
                    </Link>
                    <Link to="/watchlist" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm">
                      Danh sách của tôi
                    </Link>
                    <div className="border-t border-gray-800">
                      <button
                        onClick={() => { logout(); setShowUserMenu(false); navigate('/'); }}
                        className="w-full text-left px-4 py-2.5 text-red-400 hover:bg-gray-800 transition-colors text-sm"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-medium text-white hover:text-gray-300 transition-colors">
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium px-4 py-1.5 bg-brand hover:bg-brand-hover text-white rounded transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
