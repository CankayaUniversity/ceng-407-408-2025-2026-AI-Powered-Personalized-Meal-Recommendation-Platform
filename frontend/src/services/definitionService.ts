import { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import { EnumDefinitions } from '../types';

export const getDefinitionService = (api: AxiosInstance) => ({
  /**
   * Sistemdeki tüm enum tanımlarını backend'den getirir
   */
  getEnumDefinitions: async (): Promise<EnumDefinitions> => {
    try {
      const response = await api.get<EnumDefinitions>('/v1/definitions/enums');
      return response.data;
    } catch (error) {
      console.error('Enum tanımları yüklenirken hata oluştu:', error);
      throw error;
    }
  }
});

export const useDefinitionService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getDefinitionService(api), [api]);
};
