import api from './api';

export const RecipeService = {
  getRecipes: () => api.get('/recipes'),
  getRecipeById: (id: string) => api.get(`/recipes/${id}`),
  getRecommendations: () => api.get('/recommendations'),
};
