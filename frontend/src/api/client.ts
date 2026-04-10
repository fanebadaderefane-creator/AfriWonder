import axios from 'axios';
import { secureStorage } from '../utils/secureStorage';

// AfriWonder Production Backend
const API_BASE_URL = 'https://afri-wonder.vercel.app';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
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
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await secureStorage.setItem('accessToken', accessToken);
          await secureStorage.setItem('refreshToken', newRefreshToken);
          
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

// Fallback to local mock API if production fails
export const mockApiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL 
    ? `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`
    : 'http://localhost:8001/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

mockApiClient.interceptors.request.use(
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

// Smart client that tries production first, falls back to mock
export const smartApiClient = {
  async request(config: any) {
    try {
      return await apiClient.request(config);
    } catch (error: any) {
      // If production fails (CORS, bot detection, etc.), try mock
      if (error.code === 'ERR_NETWORK' || error.response?.status === 403) {
        console.log('Production API failed, using mock API');
        return await mockApiClient.request(config);
      }
      throw error;
    }
  },
  
  get: (url: string, config?: any) => smartApiClient.request({ ...config, method: 'get', url }),
  post: (url: string, data?: any, config?: any) => smartApiClient.request({ ...config, method: 'post', url, data }),
  put: (url: string, data?: any, config?: any) => smartApiClient.request({ ...config, method: 'put', url, data }),
  delete: (url: string, config?: any) => smartApiClient.request({ ...config, method: 'delete', url }),
};

export default mockApiClient;
