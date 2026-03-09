import { AxiosInstance } from 'axios';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';

export const getUserService = (api: AxiosInstance) => ({
  getCurrentUser: () => api.get('/v1/users/me'),
  getUserById: (id: string | number) => api.get(`/v1/users/${id}`),
  upsertUser: (data: any) => api.post('/v1/users', data),
  getDailyConsumption: () => api.get('/v1/consumption/daily'),
});

export const useUserService = () => {
  const api = useService(HttpClientKey);
  return getUserService(api);
};
