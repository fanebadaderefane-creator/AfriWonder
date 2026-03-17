import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';

import { api, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

const ACCESS_TOKEN_KEY = 'afw_access_token';
const REFRESH_TOKEN_KEY = 'afw_refresh_token';
const USER_KEY = 'afw_auth_user';

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isLoading: true,
  });

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [token, refreshToken, userJson] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);

        if (token) {
          setAuthToken(token);
          let user = null;

          if (userJson) {
            try {
              user = JSON.parse(userJson);
            } catch {
              user = null;
            }
          }

          // Si aucun utilisateur n'est stocké, on le récupère depuis /auth/me
          if (!user) {
            user = await api.auth.me();
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
          }

          setState({
            user,
            accessToken: token,
            refreshToken: refreshToken || null,
            isLoading: false,
          });
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (e) {
        console.warn('[Auth] Erreur lors du bootstrap', e);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.auth.login(email, password);
    const { accessToken, refreshToken, user } = result || {};

    if (!accessToken || !user) {
      throw new Error('Réponse de connexion invalide');
    }

    setAuthToken(accessToken);

    setState({
      user,
      accessToken,
      refreshToken: refreshToken || null,
      isLoading: false,
    });

    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      refreshToken
        ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken)
        : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);

    return user;
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setState((prev) => ({
      ...prev,
      user: null,
      accessToken: null,
      refreshToken: null,
    }));

    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
  }, []);

  const value = {
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isLoading: state.isLoading,
    login,
    logout,
    setUser: (user) =>
      setState((prev) => ({
        ...prev,
        user,
      })),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>');
  }
  return ctx;
}

