import axios, { AxiosInstance } from 'axios';
import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';
import {
  Recipe,
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
export const getRecipeService = (api: AxiosInstance) => ({
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
  getRecipes: async (): Promise<Recipe[]> => {
    throw new ApiError(
      'Bu özellik henüz kullanıma hazır değil.',
      'BACKEND_NOT_READY',
      501
    );
  },

  /**
   * Arama parametrelerine göre tarifleri filtreler
   * ⚠️ BACKEND ENDPOINT HAZIR DEĞİL
   * Backend ekibi GET /api/v1/recipes/search endpoint'ini implement ettiğinde aktif edilecek
   * @param _searchTerm - Aranacak kelime
   * @param _category - Malzeme kategorisi (opsiyonel)
   * @throws {ApiError} Backend endpoint hazır olmadığı için hata fırlatır
   */
  searchRecipes: async (_searchTerm: string, _category?: string): Promise<Recipe[]> => {
    throw new ApiError(
      'Bu özellik henüz kullanıma hazır değil.',
      'BACKEND_NOT_READY',
      501
    );
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

/**
 * DI üzerinden tarif servisine erişim sağlayan React hook
 * @returns HTTP client inject edilmiş tarif servisi instance'ı
 */
export const useRecipeService = () => {
  const api = useService(HttpClientKey);
  return getRecipeService(api);
};
