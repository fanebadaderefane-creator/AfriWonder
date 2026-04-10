import axios from 'axios';
import { Platform } from 'react-native';
import { secureStorage } from '../utils/secureStorage';
import Constants from 'expo-constants';

// ALL API calls now go through the local FastAPI proxy which adds anti-bot headers
// The proxy forwards requests to https://afriwonder.onrender.com/api with proper headers
const getProxyBaseUrl = () => {
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
    || process.env.EXPO_PUBLIC_BACKEND_URL
    || '';

  if (backendUrl) {
    return backendUrl;
  }

  // Fallback for web preview
  if (Platform.OS === 'web') {
    return '';  // Same origin, proxied via /api
  }

  return 'http://localhost:8001';
};

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
