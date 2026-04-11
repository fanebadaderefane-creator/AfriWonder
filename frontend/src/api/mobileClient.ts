import axios from 'axios';
import { Platform } from 'react-native';
import { secureStorage } from '../utils/secureStorage';
import { getBackendOrigin } from '../config/backendBase';

// Routes `/api/mobile/*` : même backend Express que la PWA (`VITE_API_URL`).
const getMobileApiBaseUrl = () => getBackendOrigin();

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
