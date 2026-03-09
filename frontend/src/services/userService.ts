import { AxiosInstance } from 'axios';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';

export const getUserService = (api: AxiosInstance) => ({
  getCurrentUser: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  getDailyConsumption: () => api.get('/consumption/daily'),
});

export const useUserService = () => {
  const api = useService(HttpClientKey);
  return getUserService(api);
};
