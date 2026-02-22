import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Hls from 'hls.js';
import { watchPartyApi } from '../../api/watchparty.api';
import { movieApi } from '../../api/movie.api';
import { useWatchPartySocket, type ChatMessage, type RoomMember, type RoomState } from '../../hooks/useWatchPartySocket';
import { useAuthStore } from '../../store/useAuthStore';
import { Users, Send, Copy, Check, LogIn, Plus, Play, Pause, List, ChevronRight, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
interface RoomInfo {
  id: string;
  inviteCode: string;
  hostUserId: string;
  movie: { name: string; thumbUrl?: string; slug?: string };
  episode?: { episodeName: string; linkM3u8?: string };
}

interface EpisodeItem {
  id: string;
  episodeName: string;
  linkM3u8?: string;
  serverName?: string;
}

// ── Lobby Screen ────────────────────────────────────────────────
function LobbyScreen({ onJoined }: { onJoined: (room: RoomInfo) => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await watchPartyApi.joinByCode(code.trim().toUpperCase());
      const room = res.data.data as RoomInfo;
      navigate(`/watch-party/${room.id}`);
      onJoined(room);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Mã mời không đúng hoặc phòng không tồn tại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-brand/20 border border-brand/30 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Watch Party</h1>
            <p className="text-gray-400 text-sm">Xem phim cùng bạn bè real-time</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <form onSubmit={handleJoin} className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nhập mã mời từ bạn</label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="VD: ABC123"
              maxLength={6}
              className="w-full px-4 py-3 bg-black/40 border border-gray-700 text-white rounded-xl text-2xl font-mono tracking-[0.5em] text-center focus:outline-none focus:border-brand transition-colors placeholder:text-gray-600 placeholder:tracking-normal placeholder:text-base"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3 bg-brand hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Đang vào...' : 'Tham gia phòng'}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800" /></div>
            <div className="relative flex justify-center"><span className="bg-gray-900 px-3 text-gray-500 text-sm">hoặc</span></div>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">Chưa có phòng? Tạo phòng từ trang chi tiết phim</p>
            <Link to="/" className="text-brand hover:underline text-sm font-semibold flex items-center justify-center gap-1">
              <Plus className="w-4 h-4" />
              Chọn phim để tạo phòng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Party Room ──────────────────────────────────────────────────
function PartyRoom({ room: initialRoom, isHost }: { room: RoomInfo; isHost: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const skipSyncRef = useRef(false);

  const [currentLink, setCurrentLink] = useState(initialRoom.episode?.linkM3u8 || '');
  const [currentEpName, setCurrentEpName] = useState(initialRoom.episode?.episodeName || 'Tập 1');
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [showEpisodes, setShowEpisodes] = useState(false);

  // Guest Controls State
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(!isHost); // Mặc định Guest vào phòng là mute để auto-play hoạt động
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Time Tracking cho Progress Bar (cả Host và Guest đều có thể dùng để xem tiến trình, nhưng Host dùng native, Guest dùng custom)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  // Fetch all episodes của phim khi vào phòng
  useEffect(() => {
    if (!initialRoom.movie.slug) return;
    movieApi.getMovieBySlug(initialRoom.movie.slug)
      .then(res => {
        const eps: EpisodeItem[] = res.data.data?.episodes || [];
        setEpisodes(eps);
      })
      .catch(() => { });
  }, [initialRoom.movie.slug]);

  // ── HLS Player ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentLink) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(currentLink);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentLink;
    }
    return () => { hlsRef.current?.destroy(); };
  }, [currentLink]);

  // ── Socket handlers ───────────────────────────────────────────
  const handleState = useCallback((state: RoomState) => {
    const video = videoRef.current;
    if (!video) return;
    skipSyncRef.current = true;
    if (Math.abs(video.currentTime - state.currentTime) > 1.5) video.currentTime = state.currentTime;

    // Nếu host PLAY mà video đang PAUSED → play (có xử lý lỗi autoplay)
    if (state.isPlaying && video.paused) {
      video.play().catch((err) => {
        console.warn('Autoplay prevented. Force muting video to play...', err);
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => { });
      });
    }
    // Nếu host PAUSE mà video đang PLAYING → pause
    if (!state.isPlaying && !video.paused) {
      video.pause();
    }

    setIsPlaying(state.isPlaying);
    setTimeout(() => { skipSyncRef.current = false; }, 300);
  }, []);

  const handleMembers = useCallback((m: RoomMember[]) => setMembers(m), []);
  const handleChat = useCallback((msg: ChatMessage) => setChat(prev => [...prev, msg]), []);
  const handleEpisodeChange = useCallback((episodeId: string) => {
    // Guest nhận event đổi tập từ Host → tìm link mới trong list episodes
    setEpisodes(prev => {
      const ep = prev.find(e => e.id === episodeId);
      if (ep?.linkM3u8) { setCurrentLink(ep.linkM3u8); setCurrentEpName(ep.episodeName); }
      return prev;
    });
  }, []);

  const { emitPlay, emitPause, emitSeek, emitChat, emitEpisode } = useWatchPartySocket(initialRoom.id, {
    onState: handleState,
    onMembers: handleMembers,
    onChat: handleChat,
    onEpisode: handleEpisodeChange,
  });

  // Auto scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  // Handle Fullscreen escape event
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Sync volume state with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Host video event binding & Time Update
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Time update cho cả Host và Guest (để render progress bar cho Guest)
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onTimeUpdate);

    if (!isHost) {
      return () => {
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('loadedmetadata', onTimeUpdate);
      };
    }

    const onPlay = () => { if (!skipSyncRef.current) { emitPlay(video.currentTime); setIsPlaying(true); } };
    const onPause = () => { if (!skipSyncRef.current) { emitPause(video.currentTime); setIsPlaying(false); } };
    const onSeeked = () => { if (!skipSyncRef.current) emitSeek(video.currentTime); };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [isHost, emitPlay, emitPause, emitSeek]);

  // Host chuyển tập
  const handleChangeEpisode = (ep: EpisodeItem) => {
    if (!isHost || !ep.linkM3u8) return;
    setCurrentLink(ep.linkM3u8);
    setCurrentEpName(ep.episodeName);
    setShowEpisodes(false);
    emitEpisode(ep.id); // Broadcast cho tất cả Guest
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    emitChat(chatInput.trim());
    setChatInput('');
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  };

  const toggleMute = () => setIsMuted(prev => !prev);
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) setIsMuted(false);
    if (val === 0 && !isMuted) setIsMuted(true);
  };

  // ── Host Controls Actions ──
  const togglePlay = () => {
    if (!isHost || !videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => { });
    } else {
      videoRef.current.pause();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost || !videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(initialRoom.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimeInfo = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background pt-16 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{initialRoom.movie.name}</p>
            <p className="text-gray-400 text-[11px] truncate">{currentEpName}</p>
          </div>
          {isHost && <span className="text-[10px] font-bold px-2 py-0.5 bg-brand/20 text-brand border border-brand/30 rounded-full shrink-0">HOST</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-gray-400 text-xs hidden sm:block">Mã phòng:</span>
          <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-mono font-bold transition-colors">
            {initialRoom.inviteCode}
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
          </button>
          <span className="text-gray-500 text-xs">{members.length} người</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 bg-black flex flex-col min-w-0" ref={videoContainerRef}>
          <div className={`relative w-full group ${isFullscreen ? 'h-full flex-1' : ''}`} style={isFullscreen ? {} : { paddingBottom: '56.25%' }}>
            {currentLink ? (
              <>
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                  onClick={togglePlay}
                  playsInline
                  autoPlay={isHost}
                />

                {/* Custom Controls Overlay (Host & Guest) */}
                <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-12 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2 z-10 duration-300">

                  {/* Time Progress Bar */}
                  <div className="w-full flex items-center gap-3">
                    <span className="text-white text-xs font-mono w-10 text-right">{formatTimeInfo(currentTime)}</span>
                    <div
                      className={`flex-1 h-1.5 bg-gray-600/50 rounded-full overflow-hidden relative group/progress ${isHost ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      title={!isHost ? "Host đang kiểm soát tiến trình" : "Tua video"}
                      onClick={isHost ? handleSeek : undefined}
                    >
                      {/* Tương tác hover (chỉ Host có tác dụng UI mờ) */}
                      {isHost && <div className="absolute top-0 left-0 w-full h-full hover:bg-white/20 transition-colors z-10" />}
                      {/* Progress */}
                      <div
                        className="absolute top-0 left-0 h-full bg-brand transition-all duration-200"
                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs font-mono w-10">{formatTimeInfo(duration)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-4">
                      {/* Play/Pause indicator */}
                      <button
                        className={`text-white transition-colors ${isHost ? 'hover:text-brand' : 'opacity-80 cursor-default'}`}
                        title={!isHost ? "Host đang điều khiển" : (isPlaying ? "Tạm dừng" : "Phát")}
                        onClick={isHost ? togglePlay : undefined}
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>

                      {/* Volume Control (Chung cho cả hai) */}
                      <div className="flex items-center gap-2 group/vol">
                        <button onClick={toggleMute} className="text-white hover:text-brand transition-colors">
                          {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        <input
                          type="range" min="0" max="1" step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-0 group-hover/vol:w-20 opacity-0 group-hover/vol:opacity-100 transition-all origin-left accent-brand h-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Fullscreen Toggle (Chung cho cả hai) */}
                    <button onClick={toggleFullscreen} className="text-white hover:text-brand transition-colors">
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10" />}
                <p className="text-sm">Phim chưa có link stream</p>
              </div>
            )}
          </div>

          {/* Episode selector bar (Host only) */}
          {isHost && episodes.length > 1 && (
            <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium flex items-center gap-1.5">
                <List className="w-4 h-4" />
                Đang xem: <span className="text-white font-bold ml-1">{currentEpName}</span>
              </span>
              <button
                onClick={() => setShowEpisodes(v => !v)}
                className="flex items-center gap-1 text-sm text-brand hover:text-red-400 font-semibold transition-colors"
              >
                Chuyển tập <ChevronRight className={`w-4 h-4 transition-transform ${showEpisodes ? 'rotate-90' : ''}`} />
              </button>
            </div>
          )}

          {/* Episode list dropdown */}
          {isHost && showEpisodes && (
            <div className="bg-gray-900 border-t border-gray-700 px-4 py-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chọn tập để phát cho cả phòng</p>
              <div className="flex flex-wrap gap-2">
                {episodes.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={() => handleChangeEpisode(ep)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${ep.episodeName === currentEpName
                      ? 'bg-brand text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                  >
                    {ep.episodeName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isHost && (
            <div className="px-4 py-2 bg-gray-900 text-gray-400 text-xs text-center flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 shrink-0" />
              Bạn đang xem với tư cách Guest. Host điều khiển video.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-72 lg:w-80 bg-gray-900 border-l border-gray-800 flex flex-col shrink-0">
          {/* Members */}
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Thành viên ({members.length})
            </h3>
            <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-gray-600 text-xs">Chưa có ai trong phòng</p>
              ) : (
                members.map((m) => (
                  <div key={m.userId} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center shrink-0 text-xs font-bold text-gray-300 overflow-hidden">
                      {m.user.avatarUrl
                        ? <img src={m.user.avatarUrl} className="w-full h-full object-cover" alt="" />
                        : (m.user.fullName || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-white text-sm truncate">{m.user.fullName || 'Ẩn danh'}</span>
                    {m.userId === initialRoom.hostUserId && (
                      <span className="text-[9px] text-brand font-bold ml-auto shrink-0">HOST</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chat.length === 0 && (
                <p className="text-gray-600 text-xs text-center pt-4">Chưa có tin nhắn. Hãy bắt đầu chat!</p>
              )}
              {chat.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${msg.userId === user?.id ? 'items-end' : 'items-start'}`}>
                  <span className="text-gray-500 text-[10px]">{msg.name}</span>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm break-words ${msg.userId === user?.id
                    ? 'bg-brand text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="p-3 border-t border-gray-800 flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Nhắn tin..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm focus:outline-none focus:border-gray-600 placeholder:text-gray-500"
              />
              <button type="submit" disabled={!chatInput.trim()} className="p-2 bg-brand hover:bg-red-700 disabled:opacity-40 text-white rounded-lg transition-colors shrink-0">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page Wrapper ────────────────────────────────────────────────
export default function WatchPartyPage() {
  const { roomId } = useParams<{ roomId?: string }>();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(!!roomId);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (!roomId) { setLoading(false); return; }

    watchPartyApi.getRoom(roomId)
      .then(res => setRoom(res.data.data))
      .catch(() => setRoom(null))
      .finally(() => setLoading(false));
  }, [roomId, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!roomId || !room) {
    return <LobbyScreen onJoined={(r) => setRoom(r)} />;
  }

  const isHost = room.hostUserId === user?.id;
  return <PartyRoom room={room} isHost={isHost} />;
}
