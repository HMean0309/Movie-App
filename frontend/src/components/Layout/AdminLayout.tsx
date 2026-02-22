import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, RefreshCcw, LogOut } from 'lucide-react';

export default function AdminLayout() {
    const { pathname } = useLocation();
    const menu = [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Đồng bộ phim', path: '/admin/sync', icon: RefreshCcw },
    ];

    return (
        <div className="flex h-screen bg-background text-white">
            {/* Sidebar */}
            <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800">
                    <Link to="/" className="text-xl font-black tracking-tighter" style={{ color: '#E50914' }}>
                        StreamX <span className="text-white text-sm font-medium">Admin</span>
                    </Link>
                </div>
                <div className="flex-1 py-4 flex flex-col gap-2 px-2">
                    {menu.map(m => {
                        const Icon = m.icon;
                        const active = pathname === m.path;
                        return (
                            <Link key={m.path} to={m.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-brand text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
                                <Icon className="w-5 h-5" /> {m.name}
                            </Link>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-gray-800">
                    <Link to="/" className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-sm font-medium transition-colors">
                        <LogOut className="w-5 h-5" /> Về trang khách
                    </Link>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-auto bg-[#0f1115]">
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
