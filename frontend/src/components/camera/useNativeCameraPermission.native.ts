/**
 * Hook permission caméra natif via `react-native-vision-camera`.
 * Métro résout ce `.native.ts` sur Android/iOS uniquement ; le web utilise
 * `./useNativeCameraPermission.ts` (fallback no-op).
 */
import { useCameraPermission } from 'react-native-vision-camera';

export interface NativeCameraPermissionState {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useNativeCameraPermission(): NativeCameraPermissionState {
  const { hasPermission, requestPermission } = useCameraPermission();
  return { hasPermission, requestPermission };
}
