import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export default function AfriWonderLogo({ size = 'md', className = '' }) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-48 h-48',
    '3xl': 'w-64 h-64',
  };

  // Logo AfriWonder : utiliser "AfriWonder logo.png" (même fichier que les icônes PWA)
  const logoUrl = '/AfriWonder%20logo.png?v=1';

  return (
    <div 
      className={cn('flex items-center justify-center afriwonder-logo', sizeClasses[size] || sizeClasses.md)}
      style={{ 
        background: 'transparent', 
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
        outline: 'none',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        filter: 'none'
      }}
    >
      {!imageError ? (
      <img
        src={logoUrl}
        alt="AfriWonder Logo"
          className={cn('object-contain', className)}
          style={{ 
            width: '100%',
            height: '100%',
            background: 'transparent', 
            backgroundColor: 'transparent', 
            display: 'block',
            mixBlendMode: 'normal',
            imageRendering: 'auto',
            borderRadius: '50%',
            clipPath: 'inset(0 round 50%)',
            WebkitClipPath: 'inset(0 round 50%)',
            boxShadow: 'none',
            filter: 'none',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none'
          }}
        loading="lazy"
        decoding="async"
          onError={() => setImageError(true)}
      />
      ) : (
        <span className="text-white font-bold text-xl">🌍</span>
      )}
    </div>
  );
}
