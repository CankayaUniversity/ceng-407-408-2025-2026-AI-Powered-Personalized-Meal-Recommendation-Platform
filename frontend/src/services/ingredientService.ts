import axios, { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import { Ingredient, UnitConversion } from '../types';
import {
  ApiError,
  NetworkError,
  AuthenticationError,
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

export const getIngredientService = (api: AxiosInstance) => ({
  searchIngredients: async (query: string, limit: number = 12): Promise<Ingredient[]> => {
    try {
      const response = await api.get<Ingredient[]>('/v1/ingredients', {
        params: { query, limit }
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Malzemeler aranamadı');
    }
  },

  getUnitConversions: async (id: number, amount: number, unit: string): Promise<UnitConversion[]> => {
    try {
      const response = await api.get<UnitConversion[]>(`/v1/ingredients/${id}/conversions`, {
        params: { amount, unit }
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Birim dönüşümleri alınamadı');
    }
  },

  getStandardConversions: async (amount: number, unit: string): Promise<UnitConversion[]> => {
    try {
      const response = await api.get<UnitConversion[]>('/v1/ingredients/conversions/standard', {
        params: { amount, unit }
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Standart birim dönüşümleri alınamadı');
    }
  },

  getAllUnitWeights: async (ingredientId?: number): Promise<Record<string, number>> => {
    try {
      const response = await api.get<Record<string, number>>('/v1/ingredients/units/weights', {
        params: { ingredientId }
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Birim ağırlıkları alınamadı');
    }
  }
});

export const useIngredientService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getIngredientService(api), [api]);
};
