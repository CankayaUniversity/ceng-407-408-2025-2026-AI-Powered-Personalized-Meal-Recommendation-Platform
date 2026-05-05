import axios, { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import { ConsumptionRequest, ConsumptionResponse, ConsumptionSummary, ConsumptionAnalysis } from '../types';
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

export const getConsumptionService = (api: AxiosInstance) => ({
  getDailySummary: async (date?: string): Promise<ConsumptionSummary> => {
    try {
      const response = await api.get<ConsumptionSummary>('/v1/consumptions/summary', {
        params: date ? { date } : undefined
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Günlük tüketim özeti alınamadı');
    }
  },

  logConsumption: async (payload: ConsumptionRequest): Promise<ConsumptionResponse> => {
    try {
      const response = await api.post<ConsumptionResponse>('/v1/consumptions', payload);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Tüketim kaydı oluşturulamadı');
    }
  },

  getUnitWeights: async (ingredientId?: number): Promise<Record<string, number>> => {
    try {
      const response = await api.get<Record<string, number>>('/v1/consumptions/units', {
        params: ingredientId ? { ingredientId } : undefined
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Birim ağırlıkları alınamadı');
    }
  },

  convertUnit: async (amount: number, unit: string, ingredientId?: number): Promise<number> => {
    try {
      const response = await api.get<number>('/v1/consumptions/convert', {
        params: { amount, unit, ingredientId }
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Birim dönüştürülemedi');
    }
  },

  getAnalysis: async (params: { startDate?: string; endDate?: string; period?: string }): Promise<ConsumptionAnalysis> => {
    try {
      const response = await api.get<ConsumptionAnalysis>('/v1/consumptions/analysis', { params });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Tüketim analizi alınamadı');
    }
  },

  getHistory: async (startDate?: string, endDate?: string): Promise<ConsumptionResponse[]> => {
    try {
      const response = await api.get<ConsumptionResponse[]>('/v1/consumptions/history', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Tüketim geçmişi alınamadı');
    }
  },

  deleteConsumption: async (id: number): Promise<void> => {
    try {
      await api.delete(`/v1/consumptions/${id}`);
    } catch (error) {
      return mapAxiosError(error, 'Tüketim kaydı silinemedi');
    }
  },

  getNutritionPreview: async (payload: ConsumptionRequest): Promise<{ calories: number; protein: number; carbs: number; fat: number }> => {
    try {
      const response = await api.post('/v1/consumptions/preview', payload);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Besin değeri tahmini alınamadı');
    }
  }
});

export const useConsumptionService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getConsumptionService(api), [api]);
};
