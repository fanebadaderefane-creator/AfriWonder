import axios from 'axios';
import { getBackendOrigin } from '../config/backendBase';
import { secureStorage } from '../utils/secureStorage';
import { useAuthStore } from '../store/authStore';
import { withAfriDeviceTrustHeaders } from '../utils/afwDeviceRequestId';

/**
 * Rafraîchit l’access token via le refresh stocké. Ne lance pas : `false` si échec.
 * Utilisé par l’intercepteur `apiClient` et les uploads multipart (nouveau `FormData` après 401).
 */
export async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = await secureStorage.getItem('refreshToken');
  if (!refreshToken?.trim()) return false;
  try {
    const origin = getBackendOrigin();
    const response = await axios.post(
      `${origin}/api/proxy/auth/refresh`,
      { refreshToken: refreshToken.trim() },
      {
        headers: withAfriDeviceTrustHeaders({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        timeout: 20000,
      }
    );
    const data = response.data?.data || response.data;
    const accessToken = data?.accessToken;
    const newRefreshToken = data?.refreshToken;
    if (typeof accessToken !== 'string' || !accessToken.trim()) return false;

    await secureStorage.setItem('accessToken', accessToken.trim());
    let nextRefresh = refreshToken.trim();
    if (typeof newRefreshToken === 'string' && newRefreshToken.trim()) {
      await secureStorage.setItem('refreshToken', newRefreshToken.trim());
      nextRefresh = newRefreshToken.trim();
    }

    useAuthStore.setState({
      accessToken: accessToken.trim(),
      refreshToken: nextRefresh,
    });
    return true;
  } catch {
    return false;
  }
}

/** Nettoie la session après échec de refresh (même comportement que l’ancien intercepteur axios). */
export async function logoutAfterFailedRefresh(): Promise<void> {
  await secureStorage.deleteItem('accessToken');
  await secureStorage.deleteItem('refreshToken');
  await secureStorage.deleteItem('user');
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  });
}
