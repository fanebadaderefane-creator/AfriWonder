import axios from 'axios';
import { Platform } from 'react-native';
import { secureStorage } from '../utils/secureStorage';
import Constants from 'expo-constants';

// Mobile-specific APIs (messaging, wallet) served by local FastAPI backend
// These complement the PWA backend (afriwonder.onrender.com)
const getMobileApiBaseUrl = () => {
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

const mobileApiClient = axios.create({
  baseURL: `${getMobileApiBaseUrl()}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add auth token interceptor
mobileApiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await secureStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token for mobile API:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export { mobileApiClient };
export default mobileApiClient;
