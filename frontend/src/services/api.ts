import { useService } from '../infrastructure/di';
import { HttpClientKey } from '../infrastructure/services';

/**
 * Hook to access the configured Axios instance through DI
 */
export const useApi = () => {
  return useService(HttpClientKey);
};

// For non-react contexts or legacy support where useService can't be used,
// we could export a way to get the instance if we had access to the registry.
// But following the yakap pattern, most things are inside the React tree.
// If needed, App.tsx's httpClient can be exported or put in a global variable (less ideal).

// Temporary bridge for existing code that imports 'api' directly
// This is not ideal but helps with incremental migration
import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
export default api;
