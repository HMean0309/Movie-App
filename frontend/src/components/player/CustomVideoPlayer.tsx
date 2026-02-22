import { useEffect, useRef, useState, useCallback } from 'react';
import {
    Play, Pause, Volume2, VolumeX, Maximize, Minimize,
    SkipForward, SkipBack, Loader2
} from 'lucide-react';

interface CustomVideoPlayerProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    poster?: string;
    title?: string;
    episodeName?: string;
    onNextEpisode?: () => void;
    onPrevEpisode?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
}

function formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CustomVideoPlayer({
    videoRef,
    poster,
    title,
    episodeName,
    onNextEpisode,
    onPrevEpisode,
    hasNext = false,
    hasPrev = false,
}: CustomVideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [loading, setLoading] = useState(true);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverX, setHoverX] = useState(0);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);

    const video = videoRef.current;

    // ── Video event listeners ──
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onTimeUpdate = () => setCurrentTime(v.currentTime);
        const onDurationChange = () => setDuration(v.duration);
        const onProgress = () => {
            if (v.buffered.length > 0) {
                setBuffered(v.buffered.end(v.buffered.length - 1));
            }
        };
        const onWaiting = () => setLoading(true);
        const onCanPlay = () => setLoading(false);
        const onLoadedData = () => setLoading(false);

        v.addEventListener('play', onPlay);
        v.addEventListener('pause', onPause);
        v.addEventListener('timeupdate', onTimeUpdate);
        v.addEventListener('durationchange', onDurationChange);
        v.addEventListener('progress', onProgress);
        v.addEventListener('waiting', onWaiting);
        v.addEventListener('canplay', onCanPlay);
        v.addEventListener('loadeddata', onLoadedData);

        return () => {
            v.removeEventListener('play', onPlay);
            v.removeEventListener('pause', onPause);
            v.removeEventListener('timeupdate', onTimeUpdate);
            v.removeEventListener('durationchange', onDurationChange);
            v.removeEventListener('progress', onProgress);
            v.removeEventListener('waiting', onWaiting);
            v.removeEventListener('canplay', onCanPlay);
            v.removeEventListener('loadeddata', onLoadedData);
        };
    }, [videoRef]);

    // ── Fullscreen change listener ──
    useEffect(() => {
        const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFSChange);
        return () => document.removeEventListener('fullscreenchange', onFSChange);
    }, []);

    // ── Auto-hide controls ──
    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
            if (playing) setShowControls(false);
        }, 3000);
    }, [playing]);

    useEffect(() => {
        resetHideTimer();
        return () => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); };
    }, [playing, resetHideTimer]);

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const v = videoRef.current;
            if (!v) return;
            // Ignore if user is typing in an input
            if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    v.paused ? v.play() : v.pause();
                    resetHideTimer();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    v.currentTime = Math.max(0, v.currentTime - 10);
                    resetHideTimer();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    v.currentTime = Math.min(v.duration, v.currentTime + 10);
                    resetHideTimer();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    v.volume = Math.min(1, v.volume + 0.1);
                    setVolume(v.volume);
                    resetHideTimer();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    v.volume = Math.max(0, v.volume - 0.1);
                    setVolume(v.volume);
                    resetHideTimer();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [videoRef, resetHideTimer]);

    // ── Controls ──
    const togglePlay = () => {
        if (!video) return;
        video.paused ? video.play() : video.pause();
        resetHideTimer();
    };

    const toggleMute = () => {
        if (!video) return;
        video.muted = !video.muted;
        setMuted(video.muted);
        resetHideTimer();
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            containerRef.current.requestFullscreen();
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!video) return;
        const val = parseFloat(e.target.value);
        video.volume = val;
        video.muted = val === 0;
        setVolume(val);
        setMuted(val === 0);
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!video || !progressRef.current) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        video.currentTime = pct * duration;
        resetHideTimer();
    };

    const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        setHoverTime(pct * duration);
        setHoverX(e.clientX - rect.left);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferProgress = duration > 0 ? (buffered / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className="relative w-full aspect-video max-h-[75vh] bg-black group select-none"
            onMouseMove={resetHideTimer}
            onMouseLeave={() => { if (playing) setShowControls(false); }}
        >
            {/* Video Element (no native controls) */}
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                poster={poster}
                onClick={togglePlay}
                onDoubleClick={toggleFullscreen}
            />

            {/* Loading Spinner */}
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <Loader2 className="w-12 h-12 text-white animate-spin opacity-80" />
                </div>
            )}

            {/* Big Center Play Button (when paused) */}
            {!playing && !loading && (
                <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center z-10"
                >
                    <div className="w-20 h-20 rounded-full bg-brand/80 backdrop-blur-sm flex items-center justify-center hover:bg-brand transition-colors shadow-[0_0_30px_rgba(220,38,38,0.5)]">
                        <Play className="w-10 h-10 text-white fill-current ml-1" />
                    </div>
                </button>
            )}

            {/* Top Gradient + Title */}
            <div
                className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 to-transparent px-6 pt-4 transition-opacity duration-300 z-30 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                {title && (
                    <div>
                        <p className="text-white font-bold text-lg truncate drop-shadow-lg">{title}</p>
                        {episodeName && (
                            <p className="text-gray-300 text-sm mt-0.5">Tập {episodeName}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 px-4 pb-3 transition-opacity duration-300 z-30 ${showControls ? 'opacity-100' : 'opacity-0'
                    }`}
            >
                {/* Progress Bar */}
                <div
                    ref={progressRef}
                    className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/progress hover:h-3 transition-all relative"
                    onClick={handleSeek}
                    onMouseMove={handleProgressHover}
                    onMouseLeave={() => setHoverTime(null)}
                >
                    {/* Buffer */}
                    <div
                        className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                        style={{ width: `${bufferProgress}%` }}
                    />
                    {/* Progress */}
                    <div
                        className="absolute top-0 left-0 h-full bg-brand rounded-full transition-[width] duration-100"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Thumb dot */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity scale-100 group-hover/progress:scale-100" />
                    </div>

                    {/* Hover time tooltip */}
                    {hoverTime !== null && (
                        <div
                            className="absolute -top-8 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none font-mono"
                            style={{ left: `${hoverX}px`, transform: 'translateX(-50%)' }}
                        >
                            {formatTime(hoverTime)}
                        </div>
                    )}
                </div>

                {/* Bottom Row */}
                <div className="flex items-center justify-between gap-3">
                    {/* Left Controls */}
                    <div className="flex items-center gap-2">
                        {/* Prev Episode */}
                        {hasPrev && (
                            <button
                                onClick={onPrevEpisode}
                                className="p-2 text-white/80 hover:text-white transition-colors"
                                title="Tập trước"
                            >
                                <SkipBack className="w-5 h-5" />
                            </button>
                        )}

                        {/* Play / Pause */}
                        <button
                            onClick={togglePlay}
                            className="p-2 text-white hover:text-brand transition-colors"
                            title={playing ? 'Tạm dừng (K)' : 'Phát (K)'}
                        >
                            {playing ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                        </button>

                        {/* Next Episode */}
                        {hasNext && (
                            <button
                                onClick={onNextEpisode}
                                className="p-2 text-white/80 hover:text-white transition-colors"
                                title="Tập tiếp theo"
                            >
                                <SkipForward className="w-5 h-5" />
                            </button>
                        )}

                        {/* Volume */}
                        <div
                            className="flex items-center gap-1 relative"
                            onMouseEnter={() => setShowVolumeSlider(true)}
                            onMouseLeave={() => setShowVolumeSlider(false)}
                        >
                            <button
                                onClick={toggleMute}
                                className="p-2 text-white/80 hover:text-white transition-colors"
                                title={muted ? 'Bật âm (M)' : 'Tắt âm (M)'}
                            >
                                {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <div className={`overflow-hidden transition-all duration-200 ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={muted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-full h-1 accent-brand cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Time */}
                        <span className="text-white/70 text-xs font-mono ml-2 select-none">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-1">
                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="p-2 text-white/80 hover:text-white transition-colors"
                            title={isFullscreen ? 'Thoát toàn màn hình (F)' : 'Toàn màn hình (F)'}
                        >
                            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
