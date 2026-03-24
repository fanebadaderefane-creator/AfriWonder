import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { api, API_URL } from '@/api/expressClient';
import { logger } from '@/lib/logger';
import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  getCachedAuthUser,
  setCachedAuthUser,
} from '@/lib/secureTokenStorage';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  authError: null,
  login: async (email, password) => { void email; void password; },
  register: async (userData) => { void userData; },
  logout: () => {},
  checkAuth: async () => {},
});
const AUTH_USER_KEY = 'afriwonder_auth_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const isCheckingAuthRef = useRef(false);

  const checkAuth = useCallback(async () => {
    if (isCheckingAuthRef.current) return;
    try {
      isCheckingAuthRef.current = true;
      setAuthError(null);

      const token = await getAccessToken();
      const refreshToken = await getRefreshToken();

      if (!token && !refreshToken) {
        setUser(null);
        setIsAuthenticated(false);
        await setCachedAuthUser(null);
        return;
      }

      if (!token && refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          await setAccessToken(data.data.accessToken);
          await setRefreshToken(data.data.refreshToken);
          const currentUser = await api.auth.me();
          setUser(currentUser);
          setIsAuthenticated(true);
          await setCachedAuthUser(currentUser);
        } catch {
          await clearTokens();
          await setCachedAuthUser(null);
          setUser(null);
          setIsAuthenticated(false);
        }
        return;
      }

      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
        await setCachedAuthUser(currentUser);
      } catch (meError) {
        if (meError.response?.status === 401 && refreshToken) {
          try {
            const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            await setAccessToken(data.data.accessToken);
            await setRefreshToken(data.data.refreshToken);
            const currentUser = await api.auth.me();
            setUser(currentUser);
            setIsAuthenticated(true);
            await setCachedAuthUser(currentUser);
          } catch {
            await clearTokens();
            await setCachedAuthUser(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          await setCachedAuthUser(null);
        }
      }
    } catch (_error) {
      logger.error('User auth check failed', _error, { context: 'checkAuth' });
      setUser(null);
      setIsAuthenticated(false);
      await setCachedAuthUser(null);
    } finally {
      setIsLoadingAuth(false);
      isCheckingAuthRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Persister le code parrainage pour l'inscription (au cas où l'utilisateur navigue avant de s'inscrire)
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref') || params.get('referral_code');
        if (refCode?.trim()) {
          window.sessionStorage?.setItem('afriwonder_referral_code', refCode.trim());
        }
      } catch (_e) {}
    }
  }, []);

  useEffect(() => {
    // Hydrater depuis le cache sécurisé (IndexedDB/Preferences ou localStorage)
    (async () => {
      const cachedUser = await getCachedAuthUser();
      if (cachedUser) {
        setUser(cachedUser);
        setIsAuthenticated(true);
      }
      await checkAuth();
    })();
    
    // Écouter les changements de localStorage pour détecter les tokens OAuth
    const handleStorageChange = (e) => {
      if (e.key === 'access_token' && e.newValue && !isCheckingAuthRef.current) {
        // Un nouveau token a été ajouté, vérifier l'authentification
        checkAuth();
      } else if (e.key === 'access_token' && !e.newValue) {
        // Le token a été supprimé
        setUser(null);
        setIsAuthenticated(false);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Écouter aussi les événements personnalisés pour les changements dans le même onglet
    const handleTokenSet = () => {
      if (!isCheckingAuthRef.current) {
        checkAuth();
      }
    };
    
    window.addEventListener('tokenSet', handleTokenSet);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tokenSet', handleTokenSet);
    };
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const userData = await api.auth.login(email, password);
      setUser(userData);
      setIsAuthenticated(true);
      setAuthError(null);
      await setCachedAuthUser(userData);
      return userData;
    } catch (_error) {
      let message = _error.apiMessage || _error.response?.data?.error?.message || _error.response?.data?.message || 'Email ou mot de passe incorrect';
      if (/Circuit breaker|upstream database|temporairement indisponible/i.test(message)) {
        message = 'Service temporairement indisponible. Réessayez dans quelques instants.';
      }
      logger.error(message, _error, { context: 'login' });
      setAuthError({ type: 'login_failed', message });
      throw new Error(message);
    }
  };

  const register = async (userData) => {
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      let refCode = params?.get('ref') || params?.get('referral_code');
      if (!refCode && typeof window !== 'undefined') {
        try {
          refCode = window.sessionStorage?.getItem('afriwonder_referral_code');
        } catch (_e) {}
      }
      const payload = { ...userData };
      if (refCode) payload.referral_code = refCode;
      const newUser = await api.auth.register(payload);
      if (refCode && typeof window !== 'undefined') {
        try {
          window.sessionStorage?.removeItem('afriwonder_referral_code');
        } catch (_e) {}
      }
      setUser(newUser);
      setIsAuthenticated(true);
      setAuthError(null);
      await setCachedAuthUser(newUser);
      return newUser;
    } catch (_error) {
      let message =
        _error.apiMessage ||
        _error.response?.data?.error?.message ||
        _error.response?.data?.message ||
        (_error.code === 'ECONNABORTED' || String(_error.message || '').includes('timeout')
          ? 'La requête a pris trop de temps. Vérifiez que l’API et PostgreSQL tournent (backend) et réessayez.'
          : null) ||
        'Inscription impossible. Vérifiez la console du backend et DATABASE_URL / JWT dans backend/.env.';
      if (/Circuit breaker|upstream database|temporairement indisponible/i.test(message)) {
        message = 'Service temporairement indisponible. Réessayez dans quelques instants.';
      }
      logger.error(message, _error, { context: 'register' });
      setAuthError({ type: 'registration_failed', message });
      throw new Error(message);
    }
  };

  const logout = () => {
    api.auth.logout();
    setCachedAuthUser(null);
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      authError,
      login,
      register,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
