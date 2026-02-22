import axiosClient from './axiosClient';

export const watchPartyApi = {
    createRoom: (movieId: string, episodeId?: string) =>
        axiosClient.post('/watch-party/rooms', { movieId, episodeId }),

    joinByCode: (inviteCode: string) =>
        axiosClient.post('/watch-party/rooms/join', { inviteCode }),

    getRoom: (roomId: string) =>
        axiosClient.get(`/watch-party/rooms/${roomId}`),
};
