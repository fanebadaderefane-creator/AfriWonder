/**
 * Politique UX : écran noir global (_layout) uniquement si le probe LAN est nécessaire
 * (Android + __DEV__ + aucune EXPO_PUBLIC_BACKEND_URL explicite).
 */
export function shouldHoldUiForAndroidDevBackendProbe(inputs: {
  platformOs: string;
  isDev: boolean;
  hasExplicitBackendOrigin: boolean;
}): boolean {
  if (inputs.platformOs !== 'android' || !inputs.isDev) return false;
  return !inputs.hasExplicitBackendOrigin;
}
