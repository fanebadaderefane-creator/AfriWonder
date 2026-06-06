import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { trimMobileAppCaches } from '../../lib/mobileMemoryMaintenance';

/**
 * À chaque changement de route : libère caches image + requêtes React Query inactives.
 * Réduit les fermetures OOM sans attendre un délai fixe sur un écran.
 */
export function MobileNavigationStability(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    trimMobileAppCaches('route-change');
  }, [pathname]);

  return null;
}
