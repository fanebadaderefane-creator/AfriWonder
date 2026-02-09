import React, { useEffect, useState } from 'react';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Monitor online/offline
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Detect slow connection
    if ('connection' in navigator) {
      const connection = navigator.connection;
      const isSlowType = ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
      setIsSlowConnection(isSlowType || connection.saveData);

      connection.addEventListener('change', () => {
        const isSlowType = ['slow-2g', '2g', '3g'].includes(connection.effectiveType);
        setIsSlowConnection(isSlowType || connection.saveData);
      });
    }

    return () => {
      window.removeEventListener('online', () => setIsOnline(true));
      window.removeEventListener('offline', () => setIsOnline(false));
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

// Cache Strategy for API Calls
export const getCacheStrategy = (isSlowConnection) => {
  return {
    staleTime: isSlowConnection ? 60000 : 30000,
    cacheTime: isSlowConnection ? 600000 : 300000,
    refetchOnWindowFocus: !isSlowConnection,
    retry: isSlowConnection ? 3 : 1
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