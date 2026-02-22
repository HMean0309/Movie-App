import axiosClient from './axiosClient';

export const watchlistApi = {
    add: (movieId: string) => axiosClient.post('/watchlist', { movieId }),
    remove: (movieId: string) => axiosClient.delete(`/watchlist/${movieId}`),
    getAll: () => axiosClient.get('/watchlist'),
    check: (movieId: string) => axiosClient.get(`/watchlist/check/${movieId}`),
};
