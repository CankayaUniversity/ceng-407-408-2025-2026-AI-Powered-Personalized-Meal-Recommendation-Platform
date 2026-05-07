import { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import { Ingredient, User } from '../types';
import {
  ApiError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  extractValidationFields
} from './errors';
import axios from 'axios';

const mapAxiosError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    const response = error.response;
    if (!response) {
      throw new NetworkError('Sunucuya bağlanılamadı.');
    }
    const status = response.status;
    const message = response.data?.message || fallback;

    switch (status) {
      case 401:
        throw new AuthenticationError('Oturum süreniz doldu.');
      case 400:
        throw new ValidationError(message, extractValidationFields(response.data));
      default:
        throw new ApiError(message, 'API_ERROR', status);
    }
  }
  throw new ApiError('Beklenmeyen bir hata oluştu');
};

export interface AdminIngredientRequest {
  name: string;
  category: string;
  density?: number;
  physicalState?: string;
  preferredUnit?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
}

export const getAdminService = (api: AxiosInstance) => ({
  // Ingredients
  getIngredient: async (id: number): Promise<Ingredient> => {
    try {
      const response = await api.get<Ingredient>(`/v1/admin/ingredients/${id}`);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Malzeme detayları alınamadı');
    }
  },

  updateIngredient: async (id: number, request: AdminIngredientRequest): Promise<Ingredient> => {
    try {
      const response = await api.put<Ingredient>(`/v1/admin/ingredients/${id}`, request);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Malzeme güncellenemedi');
    }
  },

  createIngredient: async (request: AdminIngredientRequest): Promise<Ingredient> => {
    try {
      const response = await api.post<Ingredient>('/v1/admin/ingredients', request);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Malzeme oluşturulamadı');
    }
  },

  deleteIngredient: async (id: number): Promise<void> => {
    try {
      await api.delete(`/v1/admin/ingredients/${id}`);
    } catch (error) {
      return mapAxiosError(error, 'Malzeme silinemedi');
    }
  },

  // Users
  getAllUsers: async (query?: string): Promise<User[]> => {
    try {
      const response = await api.get<User[]>('/v1/admin/users', { params: { query } });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Kullanıcı listesi alınamadı');
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    try {
      await api.delete(`/v1/admin/users/${id}`);
    } catch (error) {
      return mapAxiosError(error, 'Kullanıcı silinemedi');
    }
  },

  updateUserRole: async (id: string, role: 'ADMIN' | 'USER'): Promise<User> => {
    try {
      const response = await api.put<User>(`/v1/admin/users/${id}/role`, null, { params: { role } });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Kullanıcı rolü güncellenemedi');
    }
  },

  // Inventory
  setupTestInventory: async (): Promise<void> => {
    try {
      await api.post('/v1/admin/inventory/setup-test-inventory');
    } catch (error) {
      return mapAxiosError(error, 'Test envanteri oluşturulamadı');
    }
  },

  resetTestInventory: async (): Promise<void> => {
    try {
      await api.post('/v1/admin/inventory/reset-test-inventory');
    } catch (error) {
      return mapAxiosError(error, 'Test envanteri sıfırlanamadı');
    }
  }
});

export const useAdminService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getAdminService(api), [api]);
};
