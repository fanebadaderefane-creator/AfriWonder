import React, { useEffect, useState } from 'react';
import { isEffectiveConnectionSlow } from '@/lib/networkHints';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSlowConnection, setIsSlowConnection] = useState(() =>
    typeof navigator !== 'undefined' ? isEffectiveConnectionSlow() : false
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
    }

    let connectionCleanup;
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = /** @type {any} */ (/** @type {any} */ (navigator).connection);
      setIsSlowConnection(isEffectiveConnectionSlow());

      const onConnectionChange = () => {
        setIsSlowConnection(isEffectiveConnectionSlow());
      };
      connection.addEventListener('change', onConnectionChange);
      connectionCleanup = () => connection.removeEventListener('change', onConnectionChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      }
      if (connectionCleanup) connectionCleanup();
    };
  }, []);

  return { isOnline, isSlowConnection };
};

// Progressive Image Loading Component
export const OptimizedImage = ({ src, alt, className = '', lowQuality = false }) => {
  const [imageSrc, setImageSrc] = useState(lowQuality ? src?.replace(/\.jpg|\.png/, '_thumb.jpg') : src);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isSlowConnection: _isSlowConnection } = useNetworkStatus();

  return (
    <img
      src={imageSrc}
      alt={alt}
      loading="lazy"
      className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-75'}`}
      onLoad={() => setIsLoaded(true)}
      onError={() => setImageSrc(src)}
    />
  );
};

// Service Worker Registration
export const initializeServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration('/')
      .then((registration) => registration || navigator.serviceWorker.register('/sw-custom.js', { scope: '/' }))
      .catch(() => {});
  }
};

// Cache Strategy for API Calls (TanStack Query v5: gcTime remplace cacheTime)
export const getCacheStrategy = (isSlowConnection) => {
  return {
    // 2G/3G/saveData : moins de « refetch » inutiles ; données persistées (TanStack) servent la navigation offline
    staleTime: isSlowConnection ? 5 * 60 * 1000 : 30000,
    gcTime: isSlowConnection ? 60 * 60 * 1000 : 300000,
    refetchOnWindowFocus: !isSlowConnection,
    retry: isSlowConnection ? 4 : 1,
    retryDelay: (attempt) => {
      // Connexions lentes : backoff plus long pour laisser le temps au réseau de revenir
      if (isSlowConnection) {
        return Math.min(2500 * (attempt + 1), 12000);
      }
      return 500 * (attempt + 1);
    },
  };
};

// Request idle callback polyfill
export const scheduleTask = (callback) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (ref, callback, options = {}) => {
  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(entry.target);
      }
    }, {
      threshold: 0.1,
      ...options
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [ref, callback, options]);
};

// Estimate network speed
export const estimateNetworkSpeed = async () => {
  try {
    if (isEffectiveConnectionSlow()) return 'slow';
    const _nav = /** @type {any} */ (navigator);
    const connection = _nav.connection || _nav.mozConnection || _nav.webkitConnection;
    if (!connection) return 'high';
    return connection.effectiveType;
  } catch (_error) {
    return 'high';
  }
};