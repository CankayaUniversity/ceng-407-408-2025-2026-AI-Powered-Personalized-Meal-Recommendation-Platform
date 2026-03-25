import axios, { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import {
  Recipe,
  Difficulty,
  RecommendationRequest,
  RecommendationResponse,
  RecipeRatingRequest,
  RecipeRatingResponse
} from '../types';
import {
  ApiError,
  NetworkError,
  AuthenticationError,
  NotFoundError,
  ValidationError
} from './errors';

/**
 * Tarif servisi factory fonksiyonu
 * Tip-güvenli tarif işlemleri için servis objesi oluşturur
 */
export const getRecipeService = (api: AxiosInstance) => {
  // In-flight request deduplication map (key -> Promise)
  const inFlight = new Map<string, Promise<Recipe[]>>();

  return ({
  /**
   * AI destekli yemek önerileri getirir
   * @param request - Mevcut malzemeler ve diyet tercihleri
   * @returns Önerilen tarifler listesi döndüren Promise
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
              error.response.data?.fields
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
   * @param request - Tarif ID'si, puan ve yorum
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
            throw new NotFoundError('Tarif bulunamadı');
          case 400:
            throw new ValidationError(
              message,
              error.response.data?.fields
            );
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }

      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },

  /**
   * Tüm tarifleri getirir
   * ⚠️ BACKEND ENDPOINT HAZIR DEĞİL
   * Backend'de GET /api/v1/recipes endpoint'i implement edildiğinde aktif edilecek
   * @throws {ApiError} Backend endpoint hazır olmadığı için hata fırlatır
   */
  getRecipes: async (params?: { title?: string; page?: number; size?: number; signal?: AbortSignal }): Promise<Recipe[]> => {
    try {
      const { title, page = 0, size = 12, signal } = params || {};
      const key = `GET:/v1/recipes|${title ?? ''}|${page}|${size}`;

      // Return existing in-flight promise if present (dedupe)
      const existing = inFlight.get(key);
      if (existing) {
        return await existing;
      }

      const promise = (async () => {
        const response = await api.get<Array<{
        id: number;
        title: string;
        category?: string;
        calories?: number;
        preparationTime?: number;
        rating?: number;
        imageUrl?: string;
      }>>('/v1/recipes', {
        params: {
          page,
          size,
          ...(title ? { title } : {})
        },
        // Pass AbortSignal if provided (Axios >= 0.22)
        signal
      });

      // DTO -> UI tipi dönüştürme
      const mapped: Recipe[] = response.data.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        totalCalories: r.calories,
        preparationTimeMinutes: r.preparationTime ?? 0,
        difficulty: Difficulty.EASY, // Backend DTO'da yok; liste ekranı için varsayılan
        servings: 1, // DTO'da yok; gerekmiyor fakat tip gereği default
        averageRating: r.rating,
        imageUrl: r.imageUrl,
        instructions: ''
      }));

      return mapped; })().finally(() => { inFlight.delete(key); });

      inFlight.set(key, promise);
      return await promise;
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
            throw new ValidationError(message, error.response.data?.fields);
          default:
            throw new ApiError(message, 'API_ERROR', status);
        }
      }
      throw new ApiError('Beklenmeyen bir hata oluştu');
    }
  },

  /**
   * Arama parametrelerine göre tarifleri filtreler
   * ⚠️ BACKEND ENDPOINT HAZIR DEĞİL
   * Backend ekibi GET /api/v1/recipes/search endpoint'ini implement ettiğinde aktif edilecek
   * @param _searchTerm - Aranacak kelime
   * @param _category - Malzeme kategorisi (opsiyonel)
   * @throws {ApiError} Backend endpoint hazır olmadığı için hata fırlatır
   */
  searchRecipes: async (searchTerm: string, _category?: string): Promise<Recipe[]> => {
    return getRecipeService(api).getRecipes({ title: searchTerm, page: 0, size: 12 });
  },

  /**
   * ID'ye göre tarif detaylarını getirir
   * ⚠️ BACKEND ENDPOINT HAZIR DEĞİL
   * Backend ekibi GET /api/v1/recipes/{id} endpoint'ini implement ettiğinde aktif edilecek
   * @param _id - Tarif ID'si
   * @throws {ApiError} Backend endpoint hazır olmadığı için hata fırlatır
   */
  getRecipeById: async (_id: number): Promise<Recipe> => {
    throw new ApiError(
      'Bu özellik henüz kullanıma hazır değil.',
      'BACKEND_NOT_READY',
      501
    );
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
