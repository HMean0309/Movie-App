import axiosClient from './axiosClient';

export const movieApi = {
  getMovies: (params?: { page?: number; limit?: number; category?: string; type?: string; year?: number | string; country?: string; sort?: string; excludeCountries?: string; excludeStatus?: string; minImdb?: number }) => {
    return axiosClient.get('/movies', { params });
  },

  getMovieBySlug: (slug: string) =>
    axiosClient.get(`/movies/${slug}`),

  searchMovies: (q: string, page = 1) =>
    axiosClient.get('/movies/search', { params: { q, page } }),

  getReviews: (movieId: string) =>
    axiosClient.get(`/movies/${movieId}/reviews`).then(res => res.data.data),

  addReview: (movieId: string, data: { rating: number, comment: string }) =>
    axiosClient.post(`/movies/${movieId}/reviews`, data).then(res => res.data.data),
};
