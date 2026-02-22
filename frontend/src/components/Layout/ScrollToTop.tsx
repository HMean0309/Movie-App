import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tự động scroll về đầu trang mỗi khi đổi route
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);
    return null;
}
