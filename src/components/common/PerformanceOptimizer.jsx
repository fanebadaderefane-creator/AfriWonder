import React, { useEffect, useState } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    let connectionCleanup;
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const isSlowType = ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
      setIsSlowConnection(isSlowType || connection.saveData);

      const onConnectionChange = () => {
        const slow = ['slow-2g', '2g', '3g'].includes(connection.effectiveType) || connection.saveData;
        setIsSlowConnection(slow);
      };
      connection.addEventListener('change', onConnectionChange);
      connectionCleanup = () => connection.removeEventListener('change', onConnectionChange);
    }

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
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
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
};

// Cache Strategy for API Calls (TanStack Query v5: gcTime remplace cacheTime)
export const getCacheStrategy = (isSlowConnection) => {
  return {
    staleTime: isSlowConnection ? 60000 : 30000,
    gcTime: isSlowConnection ? 600000 : 300000,
    refetchOnWindowFocus: !isSlowConnection,
    retry: isSlowConnection ? 3 : 1,
    retryDelay: (attempt) => {
      // Connexions lentes : backoff plus long pour laisser le temps au réseau de revenir
      if (isSlowConnection) {
        return Math.min(2000 * (attempt + 1), 5000);
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
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return 'high';
    return connection.effectiveType;
  } catch (_error) {
    return 'high';
  }
};