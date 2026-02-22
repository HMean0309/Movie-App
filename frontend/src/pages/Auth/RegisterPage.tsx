import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../store/useAuthStore';
import { Play } from 'lucide-react';

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);

    try {
      const res = await authApi.register({ fullName, email, password });
      const { accessToken } = res.data.data;

      setAuth({ id: '', email: '', role: '', fullName: '', avatarUrl: '' }, accessToken);
      const profileRes = await authApi.getProfile();
      setAuth(profileRes.data.data, accessToken);

      navigate('/'); // Redirect về trang chủ sau đăng ký
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký thất bại, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(220,38,38,0.15) 0%, transparent 60%), linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0d0d0d 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Logo Fake */}
      <div className="absolute top-0 left-0 p-6 z-20">
        <Link to="/" className="flex items-center gap-2 group">
          <Play className="w-8 h-8 text-brand fill-brand group-hover:scale-110 transition-transform" />
          <span className="text-3xl font-black text-brand tracking-tighter uppercase drop-shadow-[0_2px_10px_rgba(220,38,38,0.5)]">
            StreamX
          </span>
        </Link>
      </div>

      {/* Register Box */}
      <div className="relative z-10 w-full max-w-[450px] bg-black/80 sm:bg-black/75 p-12 sm:p-16 rounded-md shadow-2xl backdrop-blur-sm mt-10">
        <h1 className="text-3xl font-bold text-white mb-8">Đăng ký</h1>

        {error && (
          <div className="bg-[#e87c03] text-white p-3 rounded mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="relative">
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full px-4 pt-6 pb-2 text-white bg-gray-800 rounded-md border border-gray-600 focus:border-white focus:outline-none focus:ring-0 peer appearance-none"
              placeholder=" "
              required
            />
            <label
              htmlFor="fullName"
              className="absolute text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3"
            >
              Họ và tên
            </label>
          </div>

          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-4 pt-6 pb-2 text-white bg-gray-800 rounded-md border border-gray-600 focus:border-white focus:outline-none focus:ring-0 peer appearance-none"
              placeholder=" "
              required
            />
            <label
              htmlFor="email"
              className="absolute text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3"
            >
              Email hoặc số điện thoại
            </label>
          </div>

          <div className="relative">
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-4 pt-6 pb-2 text-white bg-gray-800 rounded-md border border-gray-600 focus:border-white focus:outline-none focus:ring-0 peer appearance-none"
              placeholder=" "
              required
            />
            <label
              htmlFor="password"
              className="absolute text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3"
            >
              Mật khẩu
            </label>
          </div>

          <div className="relative">
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full px-4 pt-6 pb-2 text-white bg-gray-800 rounded-md border border-gray-600 focus:border-white focus:outline-none focus:ring-0 peer appearance-none"
              placeholder=" "
              required
            />
            <label
              htmlFor="confirmPassword"
              className="absolute text-gray-400 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3"
            >
              Xác nhận mật khẩu
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-4 font-bold tracking-wider py-3.5 bg-brand hover:bg-brand-hover text-white shadow-lg shadow-brand/20 transition-all rounded-md"
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </Button>
        </form>

        <div className="mt-16 text-gray-400 text-base">
          Bạn đã có tài khoản?{' '}
          <Link to="/login" className="text-white hover:underline font-medium">
            Đăng nhập ngay.
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-500 max-w-[300px]">
          Trang này được bảo vệ bởi Google reCAPTCHA để đảm bảo bạn không phải là robot.
        </p>
      </div>
    </div>
  );
}
