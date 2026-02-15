import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api/expressClient';
import { logger } from '@/lib/logger';
import axios from 'axios';

const AuthContext = createContext();

const AUTH_USER_KEY = 'afriwonder_auth_user';

function getCachedUser() {
  try {
    const tok = typeof window !== 'undefined' && (localStorage.getItem('access_token') || localStorage.getItem('refresh_token'));
    const cached = typeof window !== 'undefined' && localStorage.getItem(AUTH_USER_KEY);
    if (tok && cached) return JSON.parse(cached);
  } catch (e) {}
  return null;
}

function setCachedUser(user) {
  try {
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_KEY);
  } catch (e) {}
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

      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');

      if (!token && !refreshToken) {
        setUser(null);
        setIsAuthenticated(false);
        setCachedUser(null);
        return;
      }

      if (!token && refreshToken) {
        try {
          const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('access_token', data.data.accessToken);
          localStorage.setItem('refresh_token', data.data.refreshToken);
          const currentUser = await api.auth.me();
          setUser(currentUser);
          setIsAuthenticated(true);
          setCachedUser(currentUser);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
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
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            localStorage.setItem('access_token', data.data.accessToken);
            localStorage.setItem('refresh_token', data.data.refreshToken);
            const currentUser = await api.auth.me();
            setUser(currentUser);
            setIsAuthenticated(true);
            setCachedUser(currentUser);
          } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
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
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref') || params.get('referral_code');
      if (refCode?.trim()) {
        sessionStorage.setItem('afriwonder_referral_code', refCode.trim());
      }
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
        refCode = sessionStorage.getItem('afriwonder_referral_code');
      }
      const payload = { ...userData };
      if (refCode) payload.referral_code = refCode;
      const newUser = await api.auth.register(payload);
      if (refCode && typeof window !== 'undefined') {
        sessionStorage.removeItem('afriwonder_referral_code');
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
