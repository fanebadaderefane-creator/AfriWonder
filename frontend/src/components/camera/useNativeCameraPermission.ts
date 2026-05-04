/**
 * Web fallback du hook permission caméra. Renvoie toujours `granted: true`
 * (le navigateur gère la permission au moment où l'API `getUserMedia` est appelée
 * — ce qui n'est pas notre cas ici). Métro résout `.native.ts` sur mobile.
 */

export interface NativeCameraPermissionState {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useNativeCameraPermission(): NativeCameraPermissionState {
  return {
    hasPermission: false,
    requestPermission: async () => false,
  };
}
