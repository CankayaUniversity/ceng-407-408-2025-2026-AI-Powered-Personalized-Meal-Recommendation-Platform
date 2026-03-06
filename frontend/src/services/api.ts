import axios from 'axios';
import keycloak from '../keycloak';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(
  (config) => {
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await keycloak.updateToken(70);
        originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;
        return api(originalRequest);
      } catch (err) {
        keycloak.login();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
