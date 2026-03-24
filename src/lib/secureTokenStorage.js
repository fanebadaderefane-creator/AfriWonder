import { Preferences } from '@capacitor/preferences';
import { getItem as getLocalItem, setItem as setLocalItem, removeItem as removeLocalItem } from '@/utils/safeStorage';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_USER_KEY = 'afriwonder_auth_user';

const isCapacitorEnv = () => typeof window !== 'undefined' && !!window.Capacitor;

export async function secureGetToken(key) {
  if (isCapacitorEnv()) {
    try {
      const { value } = await Preferences.get({ key });
      return value || null;
    } catch {
      // fallback silencieux
    }
  }
  return getLocalItem(key);
}

export async function secureSetToken(key, value) {
  if (!value) {
    await secureRemoveToken(key);
    return;
  }
  if (isCapacitorEnv()) {
    try {
      await Preferences.set({ key, value });
      return;
    } catch {
      // fallback silencieux
    }
  }
  setLocalItem(key, value);
}

export async function secureRemoveToken(key) {
  if (isCapacitorEnv()) {
    try {
      await Preferences.remove({ key });
    } catch {
      // ignore
    }
  }
  removeLocalItem(key);
}

export async function getAccessToken() {
  return secureGetToken(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return secureGetToken(REFRESH_TOKEN_KEY);
}

export async function setAccessToken(token) {
  await secureSetToken(ACCESS_TOKEN_KEY, token);
}

export async function setRefreshToken(token) {
  await secureSetToken(REFRESH_TOKEN_KEY, token);
}

export async function clearTokens() {
  await secureRemoveToken(ACCESS_TOKEN_KEY);
  await secureRemoveToken(REFRESH_TOKEN_KEY);
}

export async function getCachedAuthUser() {
  if (isCapacitorEnv()) {
    try {
      const { value } = await Preferences.get({ key: AUTH_USER_KEY });
      if (!value) return null;
      return JSON.parse(value);
    } catch {
      // fallback localStorage
    }
  }
  const raw = getLocalItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    removeLocalItem(AUTH_USER_KEY);
    return null;
  }
}

export async function setCachedAuthUser(user) {
  const value = user ? JSON.stringify(user) : null;
  if (isCapacitorEnv()) {
    try {
      if (value) {
        await Preferences.set({ key: AUTH_USER_KEY, value });
      } else {
        await Preferences.remove({ key: AUTH_USER_KEY });
      }
    } catch {
      // fallback local
    }
  }
  if (value) {
    setLocalItem(AUTH_USER_KEY, value);
  } else {
    removeLocalItem(AUTH_USER_KEY);
  }
}

