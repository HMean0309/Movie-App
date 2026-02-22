import axiosClient from './axiosClient';

export const historyApi = {
    upsert: (data: { movieId: string; episodeId?: string; progressSeconds: number }) =>
        axiosClient.post('/history', data),
    getAll: () => axiosClient.get('/history'),
};
