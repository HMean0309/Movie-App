import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/auth.api';
import { User, Save, Image as ImageIcon } from 'lucide-react';

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const res = await authApi.updateProfile({ fullName, avatarUrl });
      if (res.success) {
        setAuth(res.data, useAuthStore.getState().accessToken!);
        setMessage('Cập nhật hồ sơ thành công!');
      }
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-12 animate-fade-in">
      <h1 className="text-3xl font-bold text-white mb-2">Hồ Sơ Của Tôi</h1>
      <p className="text-gray-400 mb-8">Quản lý thông tin cá nhân và hình đại diện</p>

      <div className="bg-surface border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <form onSubmit={handleSave} className="flex flex-col gap-6">

          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar Preview */}
            <div className="flex flex-col items-center gap-4 w-full md:w-1/3">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 bg-gray-900 flex-shrink-0 relative group">
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <ImageIcon className="text-white w-8 h-8 opacity-50" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold line-clamp-1">{user?.fullName}</p>
                <p className="text-gray-500 text-xs">{user?.email}</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-5 w-full">
              <div>
                <label className="text-sm font-bold text-gray-300 mb-1.5 block">Họ và Tên</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-900 border border-gray-700 focus:border-brand text-white placeholder-gray-500 transition-colors"
                    placeholder="Nhập tên hiển thị"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300 mb-1.5 block">Link Ảnh Đại Diện (Tuỳ chọn)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-gray-900 border border-gray-700 focus:border-brand text-white placeholder-gray-500 transition-colors"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Dán link ảnh bất kỳ để làm Avatar. Nếu bỏ trống, hệ thống sẽ tạo ngẫu nhiên dựa trên ID của bạn.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 mt-2 flex flex-col-reverse md:flex-row items-center justify-between gap-4">
            <span className={`text-sm font-medium ${message.includes('thành công') ? 'text-green-500' : 'text-red-500'}`}>
              {message}
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full md:w-auto px-8 py-3 bg-brand hover:bg-brand/90 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-surface border border-gray-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2">Thông tin tài khoản</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <p className="text-sm text-gray-500 mb-1">Quyền truy cập</p>
            <p className="text-white font-semibold uppercase">{user?.role}</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <p className="text-sm text-gray-500 mb-1">Trạng thái VIP</p>
            <p className="text-white font-semibold">Chưa đăng ký Gói</p>
          </div>
        </div>
      </div>
    </div>
  );
}
