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
app.use(cors());
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
