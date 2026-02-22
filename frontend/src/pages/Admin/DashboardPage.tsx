import { useEffect, useState } from 'react';
import { adminApi } from '../../api/admin.api';
import { Film, Users, Eye } from 'lucide-react';

export default function DashboardPage() {
    const [stats, setStats] = useState({ totalMovies: 0, totalUsers: 0, totalViews: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        adminApi.getStats()
            .then((res: any) => {
                if (res.success) setStats(res.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-gray-400">Đang tải dữ liệu hệ thống...</div>;

    const cards = [
        { title: 'Tổng Phim', value: stats.totalMovies.toLocaleString(), icon: Film, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { title: 'Thành viên', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
        { title: 'Lượt xem hệ thống', value: stats.totalViews.toLocaleString(), icon: Eye, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold text-white mb-6">Tổng quan hệ thống</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {cards.map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-5">
                            <div className={`p-4 rounded-xl ${c.bg} ${c.color}`}>
                                <Icon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm font-medium">{c.title}</p>
                                <p className="text-3xl font-bold text-white mt-1">{c.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
