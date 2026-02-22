import axiosClient from './axiosClient';

export const authApi = {
  register: (data: any) => axiosClient.post('/auth/register', data),
  login: (data: any) => axiosClient.post('/auth/login', data),
  getProfile: () => axiosClient.get('/auth/profile'),
  updateProfile: (data: { fullName?: string; avatarUrl?: string }) =>
    axiosClient.put('/auth/profile', data).then(res => res.data),
};
