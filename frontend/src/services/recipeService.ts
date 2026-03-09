import { AxiosInstance } from 'axios';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';

export const getRecipeService = (api: AxiosInstance) => ({
  getRecipes: () => api.get('/recipes'),
  getRecipeById: (id: string) => api.get(`/recipes/${id}`),
  getRecommendations: () => api.get('/recommendations'),
});

export const useRecipeService = () => {
  const api = useService(HttpClientKey);
  return getRecipeService(api);
};
