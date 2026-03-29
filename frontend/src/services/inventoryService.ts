import axios, { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import {
  Ingredient,
  Inventory,
  InventoryGroup,
  InventoryGroupRequest,
  InventoryItemRequest
} from '../types';
import {
  ApiError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  extractValidationFields
} from './errors';

const mapAxiosError = (error: unknown, fallback: string): never => {
  if (axios.isAxiosError(error)) {
    const response = error.response;

    if (!response) {
      throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
    }

    const status = response.status;
    const message = response.data?.message || fallback;

    switch (status) {
      case 401:
        throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
      case 400:
        throw new ValidationError(message, extractValidationFields(response.data));
      default:
        throw new ApiError(message, 'API_ERROR', status);
    }
  }

  throw new ApiError('Beklenmeyen bir hata oluştu');
};

export const getInventoryService = (api: AxiosInstance) => ({
  getInventoryGroups: async (): Promise<InventoryGroup[]> => {
    try {
      const response = await api.get<InventoryGroup[]>('/v1/inventory-groups');
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Envanter lokasyonları alınamadı');
    }
  },

  createInventoryGroup: async (payload: InventoryGroupRequest): Promise<InventoryGroup> => {
    try {
      const response = await api.post<InventoryGroup>('/v1/inventory-groups', payload);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Envanter lokasyonu oluşturulamadı');
    }
  },

  updateInventoryGroup: async (groupId: number, payload: InventoryGroupRequest): Promise<InventoryGroup> => {
    try {
      const response = await api.put<InventoryGroup>(`/v1/inventory-groups/${groupId}`, payload);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Envanter lokasyonu güncellenemedi');
    }
  },

  deleteInventoryGroup: async (groupId: number): Promise<void> => {
    try {
      await api.delete(`/v1/inventory-groups/${groupId}`);
    } catch (error) {
      return mapAxiosError(error, 'Envanter lokasyonu silinemedi');
    }
  },

  createInventoryItem: async (groupId: number, payload: InventoryItemRequest): Promise<Inventory> => {
    try {
      const response = await api.post<Inventory>(`/v1/inventory-groups/${groupId}/items`, payload);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Envanter kalemi eklenemedi');
    }
  },

  updateInventoryItem: async (groupId: number, itemId: number, payload: InventoryItemRequest): Promise<Inventory> => {
    try {
      const response = await api.put<Inventory>(`/v1/inventory-groups/${groupId}/items/${itemId}`, payload);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Envanter kalemi güncellenemedi');
    }
  },

  deleteInventoryItem: async (groupId: number, itemId: number): Promise<void> => {
    try {
      await api.delete(`/v1/inventory-groups/${groupId}/items/${itemId}`);
    } catch (error) {
      return mapAxiosError(error, 'Envanter kalemi silinemedi');
    }
  },

  searchIngredients: async (query: string, limit: number = 8): Promise<Ingredient[]> => {
    try {
      const response = await api.get<Ingredient[]>('/v1/ingredients', {
        params: {
          query,
          limit
        }
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Malzeme araması yapılamadı');
    }
  }
});

export const useInventoryService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getInventoryService(api), [api]);
};
