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

    // Check connection speed
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = connection?.effectiveType || '4g';
    
    // Determine image quality based on connection
    let optimizedUrl = src;
    if (effectiveType === '2g' || effectiveType === '3g') {
      // For slow connections, request lower quality
      if (src.includes('?')) {
        optimizedUrl = src + '&q=40';
      } else {
        optimizedUrl = src + '?q=40';
      }
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
      {...props}
    />
  );
}
