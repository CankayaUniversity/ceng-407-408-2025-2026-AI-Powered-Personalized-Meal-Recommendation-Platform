import { useMemo } from 'react';
import axios, { AxiosInstance } from 'axios';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import { User } from '../types';
import {
  ApiError,
  NetworkError,
  AuthenticationError,
  NotFoundError,
  ValidationError
} from './errors';

interface BackendValidationError {
  field: string;
  message: string;
}

interface BackendApiErrorResponse {
  message?: string;
  status?: number;
  validationErrors?: BackendValidationError[];
}

const mapValidationErrors = (data: BackendApiErrorResponse | undefined): Record<string, string> | undefined => {
  if (!data?.validationErrors?.length) {
    return undefined;
  }

  return data.validationErrors.reduce<Record<string, string>>((acc, item) => {
    if (item.field && !acc[item.field]) {
      acc[item.field] = item.message;
    }
    return acc;
  }, {});
};

const getApiErrorMeta = (
  error: unknown,
  fallbackMessage: string
): { status?: number; message: string; fields?: Record<string, string>; data?: BackendApiErrorResponse } => {
  if (!axios.isAxiosError(error)) {
    return { message: fallbackMessage };
  }

  const data = error.response?.data as BackendApiErrorResponse | undefined;

  return {
    status: error.response?.status,
    message: data?.message || fallbackMessage,
    fields: mapValidationErrors(data),
    data
  };
};

/**
 * Kullanıcı servisi factory fonksiyonu
 * Tip-güvenli kullanıcı işlemleri için servis objesi oluşturur
 */
export const getUserService = (api: AxiosInstance) => ({
  /**
   * ID'ye göre kullanıcı profilini getirir
   * @param id - Kullanıcı ID'si (Keycloak sub UUID)
   * @returns User objesi döndüren Promise
   * @throws {NetworkError} Ağ bağlantısı başarısız olduğunda
   * @throws {AuthenticationError} Kimlik doğrulama başarısız olduğunda (401)
   * @throws {NotFoundError} Kullanıcı bulunamadığında (404)
   * @throws {ApiError} Diğer API hataları için
   */
  getUserById: async (id: string): Promise<User> => {
    try {
      const response = await api.get<User>(`/v1/users/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      }

      const { status, message, fields, data } = getApiErrorMeta(error, 'Kullanıcı bilgileri alınamadı');

      switch (status) {
        case 401:
          throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        case 404:
          throw new NotFoundError('Kullanıcı bulunamadı');
        case 400:
          throw new ValidationError(message, fields);
        default:
          throw new ApiError(message, 'API_ERROR', status, data);
      }
    }
  },

  /**
   * Kullanıcı profili oluşturur veya günceller (upsert işlemi)
   * @param userData - Oluşturulacak veya güncellenecek kısmi kullanıcı verisi
   * @returns Oluşturulan/güncellenen User objesi döndüren Promise
   * @throws {NetworkError} Ağ bağlantısı başarısız olduğunda
   * @throws {AuthenticationError} Kimlik doğrulama başarısız olduğunda (401)
   * @throws {ValidationError} Doğrulama başarısız olduğunda (400)
   * @throws {ApiError} Diğer API hataları için
   */
  upsertUser: async (userData: Partial<User>): Promise<User> => {
    try {
      const response = await api.post<User>('/v1/users', userData);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      }

      const { status, message, fields, data } = getApiErrorMeta(error, 'Kullanıcı kaydedilemedi');

      switch (status) {
        case 401:
          throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        case 400:
          throw new ValidationError(message, fields);
        default:
          throw new ApiError(message, 'API_ERROR', status, data);
      }
    }
  },

  /**
   * Kullanıcı profilini günceller (düzenleme işlemleri için)
   * @param id - Güncellenecek kullanıcı ID'si
   * @param userData - Güncellenecek kısmi kullanıcı verisi
   * @returns Güncellenen User objesi döndüren Promise
   * @throws {NetworkError} Ağ bağlantısı başarısız olduğunda
   * @throws {AuthenticationError} Kimlik doğrulama başarısız olduğunda (401)
   * @throws {NotFoundError} Kullanıcı bulunamadığında (404)
   * @throws {ValidationError} Doğrulama başarısız olduğunda (400)
   * @throws {ApiError} Diğer API hataları için
   */
  updateUserProfile: async (id: string, userData: Partial<User>): Promise<User> => {
    try {
      const response = await api.post<User>('/v1/users', {
        id,
        ...userData
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      }

      const { status, message, fields, data } = getApiErrorMeta(error, 'Profil güncellenemedi');

      switch (status) {
        case 401:
          throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
        case 404:
          throw new NotFoundError('Kullanıcı bulunamadı');
        case 400:
          throw new ValidationError(message, fields);
        default:
          throw new ApiError(message, 'API_ERROR', status, data);
      }
    }
  }
});

export type UserService = ReturnType<typeof getUserService>;

/**
 * DI üzerinden kullanıcı servisine erişim sağlayan React hook
 * @returns HTTP client inject edilmiş kullanıcı servisi instance'ı
 */
export const useUserService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getUserService(api), [api]);
};
