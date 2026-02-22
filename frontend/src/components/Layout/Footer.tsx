import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-background py-10 mt-auto border-t border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="text-xl font-bold text-brand flex items-center gap-2">
            <div className="w-3 h-3 bg-brand rotate-45 rounded-sm"></div>
            StreamX
          </Link>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-gray-400">
            <Link to="/privacy" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Điều khoản dịch vụ</Link>
            <Link to="/help" className="hover:text-white transition-colors">Trung tâm hỗ trợ</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Liên hệ</Link>
          </div>

          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} StreamX, Inc. Bảo lưu mọi quyền.
          </div>
        </div>
      </div>
    </footer>
  );
}
