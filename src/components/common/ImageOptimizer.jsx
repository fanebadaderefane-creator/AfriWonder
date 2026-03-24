import React, { useState, useEffect } from 'react';

/**
 * Optimized image component for mobile with lazy loading,
 * responsive sizing, and format negotiation
 */
export default function OptimizedImage({
  src,
  alt,
  className = '',
  priority = false,
  quality: _quality = 'medium', // low, medium, high
  responsive: _responsive = true,
  ...props
}) {
  const [imageSrc, setSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [_error, setError] = useState(false);

  // Optimize image URL based on connection speed
  useEffect(() => {
    if (!src) return;

    // Check connection speed / data saver (si disponible)
    let optimizedUrl = src;
    try {
      const connection =
        typeof navigator !== 'undefined'
          ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection)
          : null;
      const effectiveType = connection?.effectiveType || '4g';
      const saveData = !!connection?.saveData;

      const isVerySlow = effectiveType === 'slow-2g' || effectiveType === '2g' || saveData;
      const isSlow = effectiveType === '3g';

      if (isVerySlow || isSlow) {
        const quality = isVerySlow ? '30' : '40';
        if (src.includes('?')) {
          optimizedUrl = `${src}&q=${quality}`;
        } else {
          optimizedUrl = `${src}?q=${quality}`;
        }
      }
    } catch {
      // Fallback: garder l'URL d'origine si navigator.connection n'est pas dispo
    }

    // N’ajoute ?format=webp que pour des chemins connus pour accepter ce paramètre
    // (évite de casser /public/*.jpg, data:, ou domaines tiers).
    try {
      const url = new URL(optimizedUrl, window.location.origin);
      const path = url.pathname || '';
      if (/\.(webp|avif|svg)(\?|$)/i.test(path)) {
        optimizedUrl = url.toString();
      } else {
        const host = url.hostname || '';
        const shouldHintWebp =
          path.startsWith('/api/') ||
          host.includes('cloudinary.com') ||
          host.includes('imgix.net');
        if (shouldHintWebp && !url.searchParams.has('format') && !url.searchParams.has('f')) {
          url.searchParams.set('format', 'webp');
        }
        optimizedUrl = url.toString();
      }
    } catch {
      // garder optimizedUrl tel quel si URL invalide
    }

    setSrc(optimizedUrl);
  }, [src]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      loading={priority ? 'eager' : 'lazy'}
      onLoad={() => setIsLoaded(true)}
      onError={() => setError(true)}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      // Réduit l'impact CLS sur le layout
      style={{ contentVisibility: 'auto' }}
      {...props}
    />
  );
}
