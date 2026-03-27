import type { ApiErrorResponse } from '../types';

/**
 * Servis katmanı için hata yönetimi tipleri ve yardımcı fonksiyonlar
 * Bu hata sınıfları uygulama genelinde tip-güvenli hata yönetimi sağlar
 */

/**
 * Temel API hata sınıfı
 * Diğer tüm hata tipleri bu sınıftan türetilir
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    // Hatanın atıldığı yerde düzgün stack trace tutar (sadece V8'de mevcut)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, ApiError);
    }
  }
}

/**
 * Ağ hatası - ağ bağlantısı başarısız olduğunda fırlatılır
 * Bağlantı zaman aşımları, DNS hataları veya ağ erişilemezliği için kullanılır
 */
export class NetworkError extends ApiError {
  constructor(message: string = 'Ağ bağlantısı kurulamadı') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, NetworkError);
    }
  }
}

/**
 * Doğrulama hatası - istemci veya sunucu doğrulaması başarısız olduğunda fırlatılır
 * Form doğrulaması için alan seviyesinde hata detayları içerir
 */
export class ValidationError extends ApiError {
  constructor(
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, ValidationError);
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Backend'in `validationErrors` dizisini form alanı -> mesaj sözlüğüne çevirir.
 * Geriye dönük uyumluluk için eski `fields` formatını da destekler.
 */
export const extractValidationFields = (
  details: ApiErrorResponse | unknown
): Record<string, string> | undefined => {
  if (!isRecord(details)) {
    return undefined;
  }

  const legacyFields = details.fields;
  if (isRecord(legacyFields)) {
    const mappedLegacyFields = Object.entries(legacyFields).reduce<Record<string, string>>((acc, [field, message]) => {
      if (typeof message === 'string') {
        acc[field] = message;
      }
      return acc;
    }, {});

    if (Object.keys(mappedLegacyFields).length > 0) {
      return mappedLegacyFields;
    }
  }

  const validationErrors = details.validationErrors;
  if (!Array.isArray(validationErrors)) {
    return undefined;
  }

  const mappedFields = validationErrors.reduce<Record<string, string>>((acc, item) => {
    if (!isRecord(item)) {
      return acc;
    }

    const field = item.field;
    const message = item.message;

    if (typeof field === 'string' && typeof message === 'string') {
      acc[field] = message;
    }

    return acc;
  }, {});

  return Object.keys(mappedFields).length > 0 ? mappedFields : undefined;
};

/**
 * Kimlik doğrulama hatası - kimlik doğrulama başarısız olduğunda veya token süresi dolduğunda fırlatılır
 * Genellikle yeniden kimlik doğrulama akışına yol açar
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Oturum süreniz doldu') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, AuthenticationError);
    }
  }
}

/**
 * Bulunamadı hatası - istenen kaynak mevcut olmadığında fırlatılır
 * HTTP 404 durumuna karşılık gelir
 */
export class NotFoundError extends ApiError {
  constructor(message: string = 'İstenen kaynak bulunamadı') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, NotFoundError);
    }
  }
}

/**
 * Kullanım Örneği:
 * 
 * Servis katmanında:
 * ```typescript
 * import axios from 'axios';
 * import { ApiError, NetworkError, AuthenticationError, NotFoundError } from './errors';
 * 
 * export const getUserService = (api: AxiosInstance) => ({
 *   getUserById: async (id: string): Promise<User> => {
 *     try {
 *       const response = await api.get<User>(`/v1/users/${id}`);
 *       return response.data;
 *     } catch (error) {
 *       if (axios.isAxiosError(error)) {
 *         if (!error.response) {
 *           throw new NetworkError();
 *         }
 *         
 *         const status = error.response.status;
 *         const message = error.response.data?.message || 'Bir hata oluştu';
 *         
 *         switch (status) {
 *           case 401:
 *             throw new AuthenticationError(message);
 *           case 404:
 *             throw new NotFoundError('Kullanıcı bulunamadı');
 *           default:
 *             throw new ApiError(message, 'API_ERROR', status);
 *         }
 *       }
 *       
 *       throw new ApiError('Beklenmeyen bir hata oluştu');
 *     }
 *   }
 * });
 * ```
 * 
 * Component'ta:
 * ```typescript
 * import { ApiError, AuthenticationError } from '../services/errors';
 * 
 * const Dashboard: React.FC = () => {
 *   const [error, setError] = useState<string | null>(null);
 *   
 *   const fetchUserProfile = async () => {
 *     setError(null);
 *     try {
 *       const profile = await userService.getUserById(user.id);
 *       setUserProfile(profile);
 *     } catch (err) {
 *       if (err instanceof AuthenticationError) {
 *         // Auth interceptor'ın yeniden kimlik doğrulamasını yapmasına izin ver
 *         return;
 *       }
 *       
 *       if (err instanceof ApiError) {
 *         setError(err.message);
 *       } else {
 *         setError('Beklenmeyen bir hata oluştu');
 *       }
 *     }
 *   };
 *   
 *   if (error) {
 *     return <ErrorState message={error} onRetry={fetchUserProfile} />;
 *   }
 *   
 *   // ... componentın geri kalanı
 * };
 * ```
 */
