import axios, { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import { User } from '../types';
import {
  ApiError,
  NetworkError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  extractValidationFields
} from './errors';

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
      if (axios.isAxiosError(error)) {
        // Ağ hatası (sunucudan yanıt yok)
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }

        const status = error.response.status;
        const message = error.response.data?.message || 'Kullanıcı bilgileri alınamadı';

        switch (status) {
          case 401:
            throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
          case 404:
            throw new NotFoundError(message);
          case 400:
            throw new ValidationError(message, extractValidationFields(error.response.data));
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }

      // Axios dışı hata
      throw new ApiError('Beklenmeyen bir hata oluştu');
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
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }

        const status = error.response.status;
        const message = error.response.data?.message || 'Kullanıcı kaydedilemedi';

        switch (status) {
          case 401:
            throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
          case 400:
            throw new ValidationError(
              message,
              extractValidationFields(error.response.data)
            );
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }

      throw new ApiError('Beklenmeyen bir hata oluştu');
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
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }

        const status = error.response.status;
        const message = error.response.data?.message || 'Profil güncellenemedi';

        switch (status) {
          case 401:
            throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
          case 404:
            throw new NotFoundError(message);
          case 400:
            throw new ValidationError(
              message,
              extractValidationFields(error.response.data)
            );
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }

      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },

  /**
   * İsim veya e-posta ile kullanıcı arar
   * @param query - Arama kelimesi
   * @returns Bulunan kullanıcı listesi
   */
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await api.get<User[]>('/v1/users/search', {
      params: { query }
    });
    return response.data;
  },

  /**
   * Kullanıcı profil fotoğrafını yükler
   * @param userId - Kullanıcı ID'si
   * @param file - Yüklenecek dosya
   * @returns Güncellenen kullanıcı verisi
   */
  uploadProfileImage: async (userId: string, file: File): Promise<User> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post<User>(`/v1/users/${userId}/profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || 'Profil fotoğrafı yüklenemedi';
        throw new ApiError(message, 'UPLOAD_ERROR', error.response?.status);
      }
      throw new ApiError('Dosya yüklenirken beklenmeyen bir hata oluştu');
    }
  }
});

/**
 * DI üzerinden kullanıcı servisine erişim sağlayan React hook
 * @returns HTTP client inject edilmiş kullanıcı servisi instance'ı
 */
export const useUserService = () => {
  const api = useService(HttpClientKey);
  return useMemo(() => getUserService(api), [api]);
};
