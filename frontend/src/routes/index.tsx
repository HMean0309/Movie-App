import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import HomePage from '../pages/Home/HomePage';
import MovieDetailPage from '../pages/MovieDetail/MovieDetail';
import WatchPage from '../pages/Watch/WatchPage';
import { LoginPage } from '../pages/Auth/LoginPage';
import { RegisterPage } from '../pages/Auth/RegisterPage';
import ProfilePage from '../pages/Profile/ProfilePage';
import SubscriptionPage from '../pages/Subscription/SubscriptionPage';
import WatchPartyPage from '../pages/WatchParty/WatchPartyPage';
import WatchlistPage from '../pages/Watchlist/WatchlistPage';
import ProtectedRoute from './ProtectedRoute';
import ProtectedAdminRoute from './ProtectedAdminRoute';
import AdminLayout from '../components/Layout/AdminLayout';
import DashboardPage from '../pages/Admin/DashboardPage';
import SyncPage from '../pages/Admin/SyncPage';

export const router = createBrowserRouter([
  // ── Auth pages (NO layout/Navbar) ──
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // ── Main app (WITH Navbar layout) ──
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'movie/:slug', element: <MovieDetailPage /> },
      { path: 'watch/:slug', element: <WatchPage /> },
      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'profile', element: <ProfilePage /> },
          { path: 'subscription', element: <SubscriptionPage /> },
          { path: 'watch-party', element: <WatchPartyPage /> },
          { path: 'watch-party/:roomId', element: <WatchPartyPage /> },
          { path: 'watchlist', element: <WatchlistPage /> },
        ],
      },
    ],
  },

  // ── Admin Area (Separate Layout) ──
  {
    path: '/admin',
    element: <ProtectedAdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'sync', element: <SyncPage /> },
        ]
      }
    ]
  },
]);
