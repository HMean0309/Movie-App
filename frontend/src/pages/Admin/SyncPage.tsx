import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';
import { Play, Square, Loader2, CheckCircle, Database, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface SyncProgress {
    status: 'idle' | 'running' | 'stopping' | 'done' | 'error';
    current: number;
    page: number;
    movieName: string;
    newAdded: number;
    skippedOrUpToDate: boolean;
}

export default function SyncPage() {
    const [progress, setProgress] = useState<SyncProgress>({
        status: 'idle', current: 0, page: 0, movieName: '', newAdded: 0, skippedOrUpToDate: false
    });
    const { accessToken } = useAuthStore();
    const [connectError, setConnectError] = useState('');
    const [isInit, setIsInit] = useState(false);

    useEffect(() => {
        if (!accessToken) return;
        const eventSource = new EventSource(`http://localhost:3001/api/admin/sync/stream?token=${accessToken}`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setProgress(data);
                setIsInit(true);
            } catch (e) { }
        };

        eventSource.onerror = () => {
            setConnectError('Mất kết nối với tiến trình nền...');
            eventSource.close();
            setTimeout(() => setConnectError(''), 5000);
        };

        return () => eventSource.close();
    }, [accessToken]);

    const handleStart = async () => {
        try {
            await adminApi.startSync();
            setConnectError('');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Có lỗi xảy ra khi bắt đầu');
        }
    };

    const handleStop = async () => {
        try {
            await adminApi.stopSync();
        } catch (e) { }
    };

    const getStatusColor = () => {
        switch (progress.status) {
            case 'running': return 'text-blue-500';
            case 'stopping': return 'text-yellow-500';
            case 'done': return 'text-green-500';
            case 'error': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getStatusText = () => {
        switch (progress.status) {
            case 'running': return 'Đang Cập Nhật Dữ Liệu...';
            case 'stopping': return 'Đang Dừng Ngang Máy Chủ...';
            case 'done': return progress.skippedOrUpToDate ? 'Sync Cập Nhật Hoàn tất (Dừng sớm do đã tải đủ phim mới)' : 'Đã duyệt xong toàn bộ kho dữ liệu!';
            case 'error': return 'Có lỗi xảy ra trong tiến trình';
            default: return 'Sẵn sàng Đồng Bộ Phim Mới';
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-2">Đồng Bộ Phim Thông Minh</h1>
            <p className="text-gray-400 mb-8 text-sm">
                Hệ thống sẽ kéo các bộ phim mới nhất từ nguồn (OPhim). Nếu gặp phim tồn tại nhưng có cập nhật tập mới, hệ thống tự động ghi đè tập mới. Nếu gặp phim đã hoàn tất tập, tiến trình sẽ chủ động ngắt để tiết kiệm bộ nhớ tài nguyên.
            </p>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-full bg-gray-800 flex items-center justify-center ${getStatusColor()}`}>
                            {progress.status === 'running' || progress.status === 'stopping' ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            ) : progress.status === 'done' ? (
                                <CheckCircle className="w-8 h-8" />
                            ) : progress.status === 'error' ? (
                                <AlertCircle className="w-8 h-8" />
                            ) : (
                                <Database className="w-8 h-8" />
                            )}
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${getStatusColor()}`}>{getStatusText()}</h2>
                            {connectError && <p className="text-red-400 text-xs mt-1">{connectError}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {!isInit ? (
                            <button disabled className="flex items-center gap-2 px-6 py-2.5 bg-gray-700 opacity-50 text-white font-semibold rounded-lg transition-colors">
                                <Loader2 className="w-4 h-4 animate-spin" /> Đang thiết lập kết nối...
                            </button>
                        ) : progress.status === 'idle' || progress.status === 'done' || progress.status === 'error' ? (
                            <button onClick={handleStart} className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand/90 text-white font-semibold rounded-lg transition-colors">
                                <Play className="w-4 h-4" /> Bắt đầu Sync
                            </button>
                        ) : (
                            <button onClick={handleStop} disabled={progress.status === 'stopping'} className="flex items-center gap-2 px-6 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors">
                                <Square className="w-4 h-4" /> {progress.status === 'stopping' ? 'Đang dừng...' : 'Dừng ngay'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Trang hiện tại</p>
                        <p className="text-2xl font-bold text-white">{progress.page || '--'}</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Đã kiểm tra</p>
                        <p className="text-2xl font-bold text-white">{progress.current || '--'}</p>
                    </div>
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Cập nhật / Thêm mới</p>
                        <p className="text-2xl font-bold text-green-400">{progress.newAdded || '--'}</p>
                    </div>
                </div>

                {/* Current Movie */}
                {(progress.status === 'running' || progress.status === 'stopping') && (
                    <div className="mt-6 pt-6 border-t border-gray-800">
                        <p className="text-sm font-medium text-gray-400">Đang xử lý:</p>
                        <p className="text-lg text-brand font-bold truncate mt-1 animate-pulse">
                            {progress.movieName || 'Đang chuẩn bị dữ liệu...'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
