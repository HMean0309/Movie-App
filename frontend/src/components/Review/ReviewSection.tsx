import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { movieApi } from '../../api/movie.api';
import { Star, Send } from 'lucide-react';

function timeAgo(dateString: string) {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
}

export default function ReviewSection({ movieId }: { movieId: string }) {
    const { user } = useAuthStore();
    const [reviews, setReviews] = useState<any[]>([]);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        movieApi.getReviews(movieId)
            .then((data) => {
                setReviews(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [movieId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim()) return;
        try {
            const newReview = await movieApi.addReview(movieId, { rating, comment });
            // Thêm review mới lên đầu, thay thế review cũ của chính user (nếu có)
            setReviews(prev => [newReview, ...prev.filter(r => r.userId !== user?.id)]);
            setComment('');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Lỗi gửi đánh giá');
        }
    };

    if (loading) return <div className="mt-8 text-gray-400">Đang tải bình luận...</div>;

    return (
        <div className="mt-12 border-t border-gray-800 pt-8 animate-fade-in">
            <h3 className="text-2xl font-bold text-white mb-6">Đánh giá & Bình luận ({reviews.length})</h3>

            {user ? (
                <form onSubmit={handleSubmit} className="bg-surface p-5 rounded-xl mb-8 border border-gray-800 shadow-sm">
                    <div className="flex gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="focus:outline-none transition-transform hover:scale-110"
                            >
                                <Star className={`w-7 h-7 ${star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <input
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            placeholder="Bạn nghĩ gì về bộ phim này?"
                            className="flex-1 bg-background border border-gray-700/50 rounded-lg px-4 py-3 text-white focus:border-brand focus:outline-none transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!comment.trim()}
                            className="bg-brand text-white px-6 py-2 rounded-lg font-medium hover:bg-brand/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" /> Gửi
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-surface p-6 rounded-xl mb-8 border border-gray-800 text-center">
                    <p className="text-gray-400 mb-2">Vui lòng đăng nhập để chia sẻ cảm nghĩ của bạn.</p>
                </div>
            )}

            {reviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {reviews.map(r => (
                        <div key={r.id} className="bg-surface p-5 rounded-xl border border-gray-800/60 shadow-sm hover:border-gray-700 transition-colors group">
                            <div className="flex items-center gap-3 mb-3">
                                <img
                                    src={r.user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.user.id}`}
                                    alt="avatar"
                                    className="w-10 h-10 rounded-full border border-gray-700 object-cover bg-gray-900"
                                />
                                <div>
                                    <p className="text-white font-bold">{r.user.fullName}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
                                            ))}
                                        </div>
                                        <span>•</span>
                                        <span>{timeAgo(r.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">{r.comment}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
