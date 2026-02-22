import axiosClient from './axiosClient';

export const adminApi = {
    getStats: () => axiosClient.get('/admin/stats').then((res: any) => res.data),
    startSync: () => axiosClient.post('/admin/sync/start').then((res: any) => res.data),
    stopSync: () => axiosClient.post('/admin/sync/stop').then((res: any) => res.data),
};
