import React from 'react';
import BrandedLaunchSplash from '@/components/common/BrandedLaunchSplash';

/**
 * Rideau initial du fil : logo centré pendant que le feed et la première vidéo se préparent derrière.
 */
export default function FeedStartupCurtain() {
  return (
    <div className="absolute inset-0 z-[120] overflow-hidden">
      <BrandedLaunchSplash position="absolute" />
    </div>
  );
}
