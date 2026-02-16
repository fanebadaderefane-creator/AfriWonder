import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { api, API_URL } from '@/api/expressClient';
import { logger } from '@/lib/logger';
import axios from 'axios';
import { getItem, setItem, removeItem, getJSON } from '@/utils/safeStorage';

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

function getCachedUser() {
  const tok = getItem('access_token') || getItem('refresh_token');
  const cached = getJSON(AUTH_USER_KEY);
  return tok && cached ? cached : null;
}

function setCachedUser(user) {
  if (user) setItem(AUTH_USER_KEY, JSON.stringify(user));
  else removeItem(AUTH_USER_KEY);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getCachedUser);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getCachedUser());
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const isCheckingAuthRef = useRef(false);

  const checkAuth = useCallback(async () => {
    if (isCheckingAuthRef.current) return;
    try {
      isCheckingAuthRef.current = true;
      setAuthError(null);

      const token = getItem('access_token');
      const refreshToken = getItem('refresh_token');

      if (!token && !refreshToken) {
        setUser(null);
        setIsAuthenticated(false);
        setCachedUser(null);
        return;
      }

      if (!token && refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          setItem('access_token', data.data.accessToken);
          setItem('refresh_token', data.data.refreshToken);
          const currentUser = await api.auth.me();
          setUser(currentUser);
          setIsAuthenticated(true);
          setCachedUser(currentUser);
        } catch {
          removeItem('access_token');
          removeItem('refresh_token');
          setCachedUser(null);
          setUser(null);
          setIsAuthenticated(false);
        }
        return;
      }

      try {
        const currentUser = await api.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
        setCachedUser(currentUser);
      } catch (meError) {
        if (meError.response?.status === 401 && refreshToken) {
          try {
            const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            setItem('access_token', data.data.accessToken);
            setItem('refresh_token', data.data.refreshToken);
            const currentUser = await api.auth.me();
            setUser(currentUser);
            setIsAuthenticated(true);
            setCachedUser(currentUser);
          } catch {
            removeItem('access_token');
            removeItem('refresh_token');
            setCachedUser(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setCachedUser(null);
        }
      }
    } catch (_error) {
      logger.error('User auth check failed', _error, { context: 'checkAuth' });
      setUser(null);
      setIsAuthenticated(false);
      setCachedUser(null);
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
    checkAuth();
    
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
      setCachedUser(userData);
      return userData;
    } catch (_error) {
      const message = _error.apiMessage || _error.response?.data?.error?.message || _error.response?.data?.message || 'Email ou mot de passe incorrect';
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
      setCachedUser(newUser);
      return newUser;
    } catch (_error) {
      const message = _error.apiMessage || _error.response?.data?.error?.message || _error.response?.data?.message || 'Inscription impossible';
      logger.error(message, _error, { context: 'register' });
      setAuthError({ type: 'registration_failed', message });
      throw new Error(message);
    }
  };

  const logout = () => {
    api.auth.logout();
    setCachedUser(null);
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
