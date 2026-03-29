import axios, { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import { ConsumptionRequest, ConsumptionResponse } from '../types';
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
  logConsumption: async (payload: ConsumptionRequest): Promise<ConsumptionResponse> => {
    try {
      const response = await api.post<ConsumptionResponse>('/v1/consumptions', payload);
      return response.data;
    } catch (error) {
      return mapAxiosError(error, 'Tüketim kaydı oluşturulamadı');
    }
  }
});

export const useConsumptionService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getConsumptionService(api), [api]);
};
