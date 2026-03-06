import api from './api';

export const UserService = {
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  getDailyConsumption: () => api.get('/consumption/daily'),
};
