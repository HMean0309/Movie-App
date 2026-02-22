import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './modules/auth/auth.routes';
import moviesRoutes from './modules/movies/movie.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import streamRoutes from './modules/streaming/stream.routes';
import watchPartyRoutes from './modules/watch-party/watch-party.routes';
import watchlistRoutes from './modules/watchlist/watchlist.routes';
import historyRoutes from './modules/history/history.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();

app.use(helmet());
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://movie-app-eta-flame-49.vercel.app'
];

if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
    allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/watch-party', watchPartyRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);

export default app;
