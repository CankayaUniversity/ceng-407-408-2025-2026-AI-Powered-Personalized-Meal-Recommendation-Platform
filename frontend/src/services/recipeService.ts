import axios, { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import {
  Recipe,
  RecipeListItem,
  RecommendationRequest,
  RecommendationResponse,
  RecipeRatingRequest,
  RecipeRatingResponse,
  RecipeRequest
} from '../types';
import {
  ApiError,
  NetworkError,
  AuthenticationError,
  NotFoundError,
  ValidationError,
  extractValidationFields
} from './errors';

type RecipeListItemDto = {
  id: number;
  title: string;
  category?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  preparationTime?: number;
  servings?: number;
  rating?: number;
  imageUrl?: string;
  isFavorite?: boolean;
};

/**
 * Tarif servisi factory fonksiyonu
 * Tip-güvenli tarif işlemleri için servis objesi oluşturur
 */
export const getRecipeService = (api: AxiosInstance) => {
  // In-flight request deduplication map (key -> Promise)
  const inFlight = new Map<string, Promise<RecipeListItem[]>>();

  return ({
  /**
   * AI destekli yemek önerileri getirir
   * @param request - Kullanıcı ID'si ve mevcut malzemeler
   * @returns Backend recommendation DTO'sunu döndüren Promise
   * @throws {NetworkError} Ağ bağlantısı başarısız olduğunda
   * @throws {AuthenticationError} Kimlik doğrulama başarısız olduğunda (401)
   * @throws {ValidationError} Doğrulama başarısız olduğunda (400)
   * @throws {ApiError} Diğer API hataları için
   */
  getRecommendations: async (request: RecommendationRequest): Promise<RecommendationResponse> => {
    try {
      const response = await api.post<RecommendationResponse>('/v1/recommendations', request);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Ağ hatası (sunucudan yanıt yok)
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }

        const status = error.response.status;
        const message = error.response.data?.message || 'Öneriler alınamadı';

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

      // Axios dışı hata
      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },

  /**
   * Tarif değerlendirmesi yapar veya günceller
   * @param request - Kullanıcı ID'si, tarif ID'si, puan ve yorum
   * @returns Oluşturulan/güncellenen değerlendirme döndüren Promise
   * @throws {NetworkError} Ağ bağlantısı başarısız olduğunda
   * @throws {AuthenticationError} Kimlik doğrulama başarısız olduğunda (401)
   * @throws {NotFoundError} Tarif bulunamadığında (404)
   * @throws {ValidationError} Doğrulama başarısız olduğunda (400)
   * @throws {ApiError} Diğer API hataları için
   */
  rateRecipe: async (request: RecipeRatingRequest): Promise<RecipeRatingResponse> => {
    try {
      const response = await api.post<RecipeRatingResponse>('/v1/ratings', request);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }

        const status = error.response.status;
        const message = error.response.data?.message || 'Değerlendirme kaydedilemedi';

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
   * Kullanıcının daha önce verdiği tarif puanlarını getirir.
   */
  getRatingsByUser: async (userId: string): Promise<RecipeRatingResponse[]> => {
    try {
      const response = await api.get<RecipeRatingResponse[]>(`/v1/ratings/user/${userId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }

        const status = error.response.status;
        const message = error.response.data?.message || 'Değerlendirmeler alınamadı';

        switch (status) {
          case 401:
            throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
          case 404:
            throw new NotFoundError(message);
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }

      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },

  /**
   * Kullanıcının geçmiş önerilerini getirir.
   */
  getRecommendationHistory: async (userId: string): Promise<RecommendationResponse[]> => {
    try {
      const response = await api.get<RecommendationResponse[]>(`/v1/recommendations/history/${userId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }

        const status = error.response.status;
        const message = error.response.data?.message || 'Geçmiş öneriler alınamadı';

        switch (status) {
          case 401:
            throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
          case 404:
            throw new NotFoundError(message);
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }

      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },
  
  /**
   * Önerilen bir tarife puan ve yorum verir.
   */
  rateRecommendation: async (request: { 
    userId: string;
    recommendedRecipeId: number; 
    rating: number; 
    comment?: string; 
  }): Promise<void> => {
    try {
      await api.post('/v1/recommendations/rate', request);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }
        const status = error.response.status;
        const message = error.response.data?.message || 'Önerilen tarif puanlanamadı';
        throw new ApiError(message, 'API_ERROR', status);
      }
      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },

  /**
   * Önerilen bir tarifi "pişirildi/yapıldı" olarak işaretler.
   */
  markAsCooked: async (recommendedRecipeId: number): Promise<void> => {
    try {
      await api.post(`/v1/recommendations/cook/${recommendedRecipeId}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }

        const status = error.response.status;
        const message = error.response.data?.message || 'Tarif pişirildi olarak işaretlenemedi';

        switch (status) {
          case 401:
            throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
          case 404:
            throw new NotFoundError(message);
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }

      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },

  /**
   * Tarif listesini backend'den getirir.
   * Response doğrudan backend liste DTO'suna hizalanır.
   */
  getRecipes: async (params?: { title?: string; page?: number; size?: number; signal?: AbortSignal }): Promise<RecipeListItem[]> => {
    try {
      const { title, page = 0, size = 12, signal } = params || {};
      const key = `GET:/v1/recipes|${title ?? ''}|${page}|${size}`;

      // Return existing in-flight promise if present (dedupe)
      const existing = inFlight.get(key);
      if (existing) {
        return await existing;
      }

      const promise = (async () => {
        const response = await api.get<RecipeListItemDto[]>('/v1/recipes', {
        params: {
          page,
          size,
          ...(title ? { title } : {})
        },
        // Pass AbortSignal if provided (Axios >= 0.22)
        signal
      });

      // DTO -> UI tipi dönüştürme
      const mapped: RecipeListItem[] = response.data.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        totalCalories: r.calories,
        totalProtein: r.protein,
        totalCarbs: r.carbs,
        totalFat: r.fat,
        preparationTimeMinutes: r.preparationTime,
        servings: r.servings,
        averageRating: r.rating,
        imageUrl: r.imageUrl,
        isFavorite: r.isFavorite || false
      }));

      return mapped; })();

      inFlight.set(key, promise);
      const result = await promise;
      inFlight.delete(key);
      return result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new NetworkError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
        }
        const status = error.response.status;
        const message = error.response.data?.message || 'Tarifler alınamadı';
        switch (status) {
          case 401:
            throw new AuthenticationError('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
          case 400:
            throw new ValidationError(message, extractValidationFields(error.response.data));
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }
      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },

  /**
   * Başlığa göre tarif araması yapar.
   * Backend'de ayrı bir search endpoint'i yerine mevcut liste endpoint'inin `title` filtresi kullanılır.
   * @param searchTerm - Aranacak kelime
   * @param _category - Malzeme kategorisi (opsiyonel)
   */
  searchRecipes: async (searchTerm: string, _category?: string): Promise<RecipeListItem[]> => {
    return getRecipeService(api).getRecipes({ title: searchTerm, page: 0, size: 12 });
  },

    /**
     * ID'ye göre tarif detaylarını getirir.
     * @param id - Tarifin benzersiz kimlik numarası
     */
    getRecipeById: async (id: number): Promise<Recipe> => {
      const response = await api.get<Recipe>(`/v1/recipes/${id}`);
      return response.data;
    },

    /**
     * Tarifin tüm versiyonlarını getirir.
     */
    getRecipeVersions: async (id: number): Promise<Recipe[]> => {
      const response = await api.get<Recipe[]>(`/v1/recipes/${id}/versions`);
      return response.data;
    },

    /**
     * Tarif görselini yükler (Sadece ADMIN)
     * @param id - Tarif ID'si
     * @param file - Yüklenecek dosya
     * @returns Güncellenen tarif verisi
     */
    uploadRecipeImage: async (id: number, file: File): Promise<Recipe> => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post<Recipe>(`/v1/recipes/${id}/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.message || 'Tarif görseli yüklenemedi';
          throw new ApiError(message, 'UPLOAD_ERROR', error.response?.status);
        }
        throw new ApiError('Dosya yüklenirken beklenmeyen bir hata oluştu');
      }
    },

    /**
     * Yeni bir tarif oluşturur.
     * @param request - Tarif oluşturma verileri
     */
    createRecipe: async (request: RecipeRequest): Promise<Recipe> => {
      try {
        const response = await api.post<Recipe>('/v1/recipes', request);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.message || 'Tarif oluşturulamadı';
          if (status === 400) {
            throw new ValidationError(message, extractValidationFields(error.response?.data));
          }
          throw new ApiError(message, 'CREATE_ERROR', status);
        }
        throw new ApiError('Tarif oluşturulurken beklenmeyen bir hata oluştu');
      }
    },

    /**
     * Mevcut bir tarifi günceller.
     * @param id - Tarif ID'si
     * @param request - Güncellenecek tarif verileri
     */
    updateRecipe: async (id: number, request: RecipeRequest): Promise<Recipe> => {
      try {
        const response = await api.put<Recipe>(`/v1/recipes/${id}`, request);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.message || 'Tarif güncellenemedi';
          if (status === 400) {
            throw new ValidationError(message, extractValidationFields(error.response?.data));
          }
          if (status === 404) {
            throw new NotFoundError(message);
          }
          throw new ApiError(message, 'UPDATE_ERROR', status);
        }
        throw new ApiError('Tarif güncellenirken beklenmeyen bir hata oluştu');
      }
    },

    /**
     * Tarifi onaya gönderir.
     * @param id - Tarif ID'si
     */
    sendToApproval: async (id: number): Promise<void> => {
      try {
        await api.post(`/v1/recipes/${id}/send-to-approval`);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.message || 'Tarif onaya gönderilemedi';
          throw new ApiError(message, 'APPROVAL_ERROR', error.response?.status);
        }
        throw new ApiError('İşlem sırasında beklenmeyen bir hata oluştu');
      }
    },

    /**
     * Tarifi favorilere ekler veya çıkarır.
     * @param id - Tarif ID'si
     * @returns Yeni favori durumu (true: eklendi, false: çıkarıldı)
     */
    toggleFavorite: async (id: number): Promise<boolean> => {
      try {
        const response = await api.post<boolean>(`/v1/recipes/${id}/favorite`);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.message || 'Favori işlemi başarısız';
          throw new ApiError(message, 'FAVORITE_ERROR', error.response?.status);
        }
        throw new ApiError('İşlem sırasında beklenmeyen bir hata oluştu');
      }
    },

    /**
     * Tarifi onaylar (Sadece ADMIN)
     * @param id - Tarif ID'si
     */
    approveRecipe: async (id: number): Promise<void> => {
      try {
        await api.post(`/v1/recipes/${id}/approve`);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.message || 'Tarif onaylanamadı';
          throw new ApiError(message, 'APPROVE_ERROR', error.response?.status);
        }
        throw new ApiError('İşlem sırasında beklenmeyen bir hata oluştu');
      }
    },

    /**
     * Tarifi reddeder (Sadece ADMIN)
     * @param id - Tarif ID'si
     */
    rejectRecipe: async (id: number): Promise<void> => {
      try {
        await api.post(`/v1/recipes/${id}/reject`);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const message = error.response?.data?.message || 'Tarif reddedilemedi';
          throw new ApiError(message, 'REJECT_ERROR', error.response?.status);
        }
        throw new ApiError('İşlem sırasında beklenmeyen bir hata oluştu');
      }
    }

});
};

/**
 * DI üzerinden tarif servisine erişim sağlayan React hook
 * @returns HTTP client inject edilmiş tarif servisi instance'ı
 */
export const useRecipeService = () => {
  const api = useService(HttpClientKey);
  // Memoize service instance so its reference stays stable across renders
  // and doesn't cause effects or consumers to re-run unnecessarily.
  const service = useMemo(() => getRecipeService(api), [api]);
  return service;
};
