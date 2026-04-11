import axios from 'axios';
import { Platform } from 'react-native';
import { secureStorage } from '../utils/secureStorage';
import { getBackendOrigin } from '../config/backendBase';

// Même route que la PWA : `/api/proxy` sur l’origine backend (Express, port 3000 en dev).
const getProxyBaseUrl = () => getBackendOrigin();

const apiClient = axios.create({
  baseURL: `${getProxyBaseUrl()}/api/proxy`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await secureStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getItem('refreshToken');
        if (refreshToken) {
          // Use proxy for token refresh too
          const proxyBase = `${getProxyBaseUrl()}/api/proxy`;
          const response = await axios.post(`${proxyBase}/auth/refresh`, {
            refreshToken,
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          });

          const data = response.data?.data || response.data;
          const { accessToken, refreshToken: newRefreshToken } = data;
          await secureStorage.setItem('accessToken', accessToken);
          if (newRefreshToken) {
            await secureStorage.setItem('refreshToken', newRefreshToken);
          }

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, user needs to re-login
        await secureStorage.deleteItem('accessToken');
        await secureStorage.deleteItem('refreshToken');
        await secureStorage.deleteItem('user');
      }
    }

    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;
