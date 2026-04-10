import axios from 'axios';
import { Platform } from 'react-native';
import { secureStorage } from '../utils/secureStorage';

// AfriWonder Production Backend on Render
const API_BASE_URL = 'https://afriwonder.onrender.com';

// On native (mobile), we add headers to bypass bot detection
// On web, browsers handle these headers automatically
const nativeHeaders = Platform.OS !== 'web' ? {
  'User-Agent': 'AfriWonder-Mobile/1.0 (React Native; Expo)',
  'Origin': 'https://afriwonder.onrender.com',
  'Referer': 'https://afriwonder.onrender.com/',
} : {};

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...nativeHeaders,
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
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...nativeHeaders,
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
